/**
 * Client WebSocket FFCK — connecte à wss://livecompet.ffck.org/wss2/
 * et récupère un snapshot des résultats live en cours.
 *
 * Protocole FFCK (3 commandes séquentielles) :
 *   1. <competition_load>  → liste des compétitions (avec flag "active")
 *   2. <race_load>         → épreuves d'une compétition
 *   3. <epreuve_load>      → classement complet d'une épreuve
 *
 * Format de données : tables ADV (JSON avec columns[] + rows[][])
 * Colonnes de classement encodées : @RK_{course}_{phase}_1 = rang,
 *   @TIME_{course}_{phase}_1 = temps final, @CHRONO_ = temps brut
 */

import WebSocket from "ws";

const WS_URL    = "wss://livecompet.ffck.org/wss2/";
const TIMEOUT   = 28_000; // 28s — laisse 2s de marge avant le maxDuration Vercel

// ── Types ──────────────────────────────────────────────────────────────────

interface AdvTable {
  columns: [string, ...unknown[]][];
  rows:    unknown[][];
}

export interface FFCKLiveEntry {
  competition_key:   string;
  competition_nom:   string;
  competition_ville: string;
  code_activite:     string;
  epreuve:           string;
  etat_epreuve:      number; // 3 = en cours, 4 = officieux
  rang:              number | null;
  dossard:           number;
  nom:               string;
  club:              string;
  code_nation:       string;
  temps_ms:          number | null;
  temps_display:     string;
  synced_at:         string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractTable(obj: Record<string, unknown>, key: string): AdvTable | null {
  const t = obj[key];
  if (!t || typeof t !== "object") return null;
  const table = t as Record<string, unknown>;
  if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) return null;
  return table as unknown as AdvTable;
}

function cell(tbl: AdvTable, colName: string, row: number): string {
  const idx = tbl.columns.findIndex(c => c[0] === colName);
  if (idx < 0 || row >= tbl.rows.length) return "";
  return String(tbl.rows[row][idx] ?? "");
}

export function fmtChrono(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (isNaN(ms)) return "—";
  if (ms < 0) {
    if (ms === -500) return "DNF";
    if (ms === -600) return "DNS";
    if (ms === -700) return "DES";
    if (ms === -800) return "DSQ";
    return "—";
  }
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cc = Math.floor((ms % 1000) / 10);
  return m > 0
    ? `${m}:${String(s).padStart(2, "0")}.${String(cc).padStart(2, "0")}`
    : `${s}.${String(cc).padStart(2, "0")}`;
}

// ── Connexion WebSocket ────────────────────────────────────────────────────

export async function fetchFFCKSnapshot(): Promise<FFCKLiveEntry[]> {
  return new Promise((resolve) => {
    const all: FFCKLiveEntry[] = [];
    let ws: WebSocket;
    let timer: ReturnType<typeof setTimeout>;
    const now = new Date().toISOString();

    const finish = () => {
      clearTimeout(timer);
      try { ws?.terminate(); } catch { /* ignore */ }
      resolve(all);
    };

    timer = setTimeout(finish, TIMEOUT);

    try {
      ws = new WebSocket(WS_URL);
    } catch {
      clearTimeout(timer);
      resolve([]);
      return;
    }

    // État de la navigation
    type CompInfo = { key: string; Nom: string; Ville: string; Code_activite: string };
    let pendingRaces:    CompInfo[] = [];
    let currentRace:     CompInfo  | null = null;
    let currentRaceMsg:  Record<string, unknown> | null = null;

    type EpreuveInfo = { libelle: string; etat: number };
    let pendingEpreuves: EpreuveInfo[] = [];
    let currentEpreuve:  EpreuveInfo   | null = null;

    const nextRace = () => {
      if (!pendingRaces.length) { finish(); return; }
      currentRace = pendingRaces.shift()!;
      ws.send(JSON.stringify({ key: "<race_load>", key_race: currentRace.key }));
    };

    const nextEpreuve = () => {
      if (!pendingEpreuves.length) { nextRace(); return; }
      currentEpreuve = pendingEpreuves.shift()!;
      ws.send(JSON.stringify({ key: "<epreuve_load>", epreuve: currentEpreuve.libelle }));
    };

    ws.on("open", () => {
      ws.send(JSON.stringify({ key: "<competition_load>", mode_test: 0 }));
    });

    ws.on("message", (raw: Buffer) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      const k = msg.key as string;

      // ── Liste des compétitions ──────────────────────────────────────
      if (k === "<competition_load>") {
        const tbl = extractTable(msg, "competitions");
        if (!tbl) { finish(); return; }

        for (let r = 0; r < tbl.rows.length; r++) {
          if (parseInt(cell(tbl, "active", r) || "0") !== 1) continue;
          pendingRaces.push({
            key:           cell(tbl, "key",           r),
            Nom:           cell(tbl, "Nom",           r),
            Ville:         cell(tbl, "Ville",         r),
            Code_activite: cell(tbl, "Code_activite", r),
          });
        }

        if (!pendingRaces.length) { finish(); return; }
        nextRace();

      // ── Données d'une course (liste épreuves) ──────────────────────
      } else if (k === "<race_load>") {
        currentRaceMsg = msg;
        const tbl = extractTable(msg, "Competition_Course_Phase_Manche_Epreuve");
        pendingEpreuves = [];

        if (tbl) {
          for (let r = 0; r < tbl.rows.length; r++) {
            if (parseInt(cell(tbl, "Nombre", r) || "0") <= 0) continue;
            const etat = parseInt(cell(tbl, "Etat_programme_epreuve", r) || "0");
            // Synchro uniquement : en cours (3) et officieux (4)
            if (etat === 3 || etat === 4) {
              pendingEpreuves.push({ libelle: cell(tbl, "Libelle_court", r), etat });
            }
          }
        }

        nextEpreuve();

      // ── Classement d'une épreuve ────────────────────────────────────
      } else if (k === "<epreuve_load>") {
        const tbl = extractTable(msg, "ranking");

        if (tbl && currentRace && currentRaceMsg && currentEpreuve) {
          const course = String(currentRaceMsg.Code_course ?? "1");
          const phase  = String(currentRaceMsg.Code_phase  ?? "1");
          const cp     = `${course}_${phase}`;

          // Noms encodés → indices
          const rankCol   = `@RK_${cp}_1`;
          const timeCol   = `@TIME_${cp}_1`;
          const chronoCol = `@CHRONO_${cp}_1`;

          for (let r = 0; r < tbl.rows.length; r++) {
            const dossard = parseInt(cell(tbl, "Dossard", r) || "0");
            if (dossard <= 0) continue;

            const timeStr = cell(tbl, timeCol, r) || cell(tbl, chronoCol, r);
            const temps_ms = timeStr !== "" ? parseInt(timeStr) : null;
            const rankStr  = cell(tbl, rankCol, r);

            all.push({
              competition_key:   currentRace.key,
              competition_nom:   currentRace.Nom,
              competition_ville: currentRace.Ville,
              code_activite:     currentRace.Code_activite,
              epreuve:           currentEpreuve.libelle,
              etat_epreuve:      currentEpreuve.etat,
              rang:              parseInt(rankStr) > 0 ? parseInt(rankStr) : null,
              dossard,
              nom:               cell(tbl, "Bateau",      r),
              club:              cell(tbl, "Club",        r),
              code_nation:       cell(tbl, "Code_nation", r),
              temps_ms:          (temps_ms !== null && !isNaN(temps_ms)) ? temps_ms : null,
              temps_display:     fmtChrono((temps_ms !== null && !isNaN(temps_ms)) ? temps_ms : null),
              synced_at:         now,
            });
          }
        }

        nextEpreuve();
      }
      // Les broadcasts (<bib_time>, <on_course>, <msg>, …) sont ignorés
    });

    ws.on("error", finish);
    ws.on("close", () => { /* géré par finish() */ });
  });
}
