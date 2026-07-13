"use client";

import { useEffect, useState } from "react";
import type { BetType } from "@/lib/algo/types";
import { probExactPlace, probToCote, ALGO_PARAMS } from "@/lib/algo/bradley-terry";
import OddsInfoModal from "./OddsInfoModal";
import AlgoBetaInfoModal from "./AlgoBetaInfoModal";

const BETA_INFO_SEEN_KEY = "kb_algo_beta_seen_v1";

// Cote "place exacte" DYNAMIQUE : recalculée selon la place choisie et la
// distribution de l'athlète (rang espéré + sigma), même formule que le serveur.
function dynamicPlaceCote(row: { rang_espere: number; sigma: number }, place: number): number {
  const p = probExactPlace(Number(row.rang_espere), Number(row.sigma), place);
  return probToCote(p, ALGO_PARAMS.COTE_MIN_EXACT, ALGO_PARAMS.COTE_MAX_EXACT_PLACE);
}

export type BetOdd = {
  id: string;
  participantId: string;
  betType: BetType;
  betLabel: string;
  nm: string;
  ctry: string;
  note: string;
  val: number;
  fav?: boolean;
  competitionId?: string;
  categorie?: string;
  codeBateau?: string | null;
  targetPlace?: number;
  predictedTimeSeconds?: number;
};

type CotesRow = {
  code_bateau: string;
  nom: string;
  categorie: string;
  rang_espere: number;
  sigma: number;
  cote_top1: number;
  cote_top3: number;
  cote_top5: number;
  cote_top10: number;
  cote_top20: number;
  cote_exact_place: number;
  cote_exact_time: number;
  cote_exact_time_second: number;
};

// Types affichés en v4 (Top 10 / Top 20 retirés).
const BET_TYPES: { type: BetType; label: string }[] = [
  { type: "TOP_1", label: "Vainqueur" },
  { type: "TOP_3", label: "Top 3" },
  { type: "TOP_5", label: "Top 5" },
  { type: "EXACT_PLACE", label: "Place exacte" },
  { type: "EXACT_TIME", label: "Temps au dixième" },
  { type: "EXACT_TIME_SECOND", label: "Temps à la seconde" },
];

// Exhaustif sur BetType (Top10/20 conservés pour compat même si non affichés).
const COTE_FIELD: Record<BetType, keyof CotesRow> = {
  TOP_1: "cote_top1",
  TOP_3: "cote_top3",
  TOP_5: "cote_top5",
  TOP_10: "cote_top10",
  TOP_20: "cote_top20",
  EXACT_PLACE: "cote_exact_place",
  EXACT_TIME: "cote_exact_time",
  EXACT_TIME_SECOND: "cote_exact_time_second",
};

const TYPE_LABEL: Record<string, string> = { sprint: "Sprint", classique: "Classique" };

type Props = {
  onBack: () => void;
  competitionId: string;
  competitionNom: string;
  odds: BetOdd[]; // toutes catégories confondues — la startlist complète de la compétition
  typeCompetition?: string | null;
  parisOuvertsA?: string | null;
  coupon: Record<string, BetOdd>;
  toggle: (o: BetOdd) => void;
  couponCount: number;
  onOpenCoupon: () => void;
};

function fmtOpensAt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export default function CategoryBetModal({
  onBack, competitionId, competitionNom, odds, typeCompetition, parisOuvertsA, coupon, toggle, couponCount, onOpenCoupon,
}: Props) {
  const [selectedCat, setSelectedCat] = useState("");
  const [search, setSearch] = useState("");
  const [cotes, setCotes] = useState<CotesRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [betaInfoOpen, setBetaInfoOpen] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(
    parisOuvertsA && new Date(parisOuvertsA).getTime() > Date.now() ? parisOuvertsA : null
  );

  // Pop-up bêta/algo : affiché une seule fois, la première fois qu'un joueur
  // ouvre une compétition pour parier (mémorisé en localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(BETA_INFO_SEEN_KEY)) {
      setBetaInfoOpen(true);
      window.localStorage.setItem(BETA_INFO_SEEN_KEY, "1");
    }
  }, []);

  // Saisie inline pour Place exacte (n°), Temps au dixième et Temps à la
  // seconde — ces types ne s'ajoutent pas au coupon au 1er clic, ils ouvrent
  // d'abord un champ. Place exacte : cote DYNAMIQUE calculée en direct.
  const [expandedInput, setExpandedInput] = useState<{ participantId: string; type: "EXACT_PLACE" | "EXACT_TIME" | "EXACT_TIME_SECOND" } | null>(null);
  const [placeValue, setPlaceValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeSecondValue, setTimeSecondValue] = useState("");
  const [inputError, setInputError] = useState("");

  const cats = [...new Set(odds.map(o => o.categorie).filter(Boolean))].sort() as string[];

  // Choisit une catégorie par défaut à l'ouverture. Ne dépend volontairement
  // que de [competitionId] (pas de `cats`) — sinon un re-render parent
  // (ex: le compte à rebours) pourrait réinitialiser la sélection de
  // l'utilisateur en cours de consultation.
  useEffect(() => {
    setSelectedCat(prev => (cats.includes(prev) && prev) || cats[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  useEffect(() => {
    setLockedUntil(parisOuvertsA && new Date(parisOuvertsA).getTime() > Date.now() ? parisOuvertsA : null);
  }, [competitionId, parisOuvertsA]);

  useEffect(() => {
    if (!selectedCat || lockedUntil) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/competitions/${competitionId}/cotes?categorie=${encodeURIComponent(selectedCat)}`)
      .then(async (res) => {
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled && body.locked && body.opensAt) setLockedUntil(body.opensAt);
          return [];
        }
        return res.json();
      })
      .then((data) => { if (!cancelled) setCotes(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError("Impossible de charger les cotes."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [competitionId, selectedCat, lockedUntil]);

  const cotesByCode = new Map((cotes ?? []).map(c => [c.code_bateau, c]));
  const q = search.trim().toLowerCase();
  const participants = odds
    .filter(o => o.categorie === selectedCat)
    .filter(p => !q || p.nm.toLowerCase().includes(q) || p.ctry.toLowerCase().includes(q));

  return (
    <>
      <div className="catmodal-head">
        <button className="catmodal-back" aria-label="Retour" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <div className="catmodal-cat">
            {selectedCat}
            {typeCompetition && TYPE_LABEL[typeCompetition] && (
              <span className="catmodal-type"> · {TYPE_LABEL[typeCompetition]}</span>
            )}
          </div>
          <h3>{competitionNom}</h3>
        </div>
        <button className="catmodal-back" aria-label="Comprendre les cotes" onClick={() => setInfoOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="7.8" r="1.1" fill="currentColor" /></svg>
        </button>
      </div>

      <div className="catmodal-scroll">
        {lockedUntil ? (
          <div className="catmodal-locked">
            <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <p className="catmodal-locked-title">Paris pas encore ouverts</p>
            <p className="catmodal-locked-sub">Rendez-vous le {fmtOpensAt(lockedUntil)}</p>
          </div>
        ) : cats.length > 1 && (
          <div className="cat-tabs catmodal-cat-tabs">
            {cats.map(cat => (
              <button
                key={cat}
                className={`cat-tab${selectedCat === cat ? " active" : ""}`}
                onClick={() => setSelectedCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {!lockedUntil && (
          <div className="catmodal-search">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <input
              type="text"
              placeholder="Chercher un participant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Effacer" onClick={() => setSearch("")}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            )}
          </div>
        )}

        {!lockedUntil && <div className="catmodal-body">
          {loading && <p className="catmodal-status">Chargement des cotes…</p>}
          {!loading && error && <p className="catmodal-status err">{error}</p>}
          {!loading && !error && participants.length === 0 && (
            <p className="catmodal-status">{q ? "Aucun participant ne correspond à ta recherche." : "Aucun participant dans cette catégorie."}</p>
          )}

          {!loading && !error && participants.map((p) => {
            const cotesRow = p.codeBateau ? cotesByCode.get(p.codeBateau) : undefined;
            return (
              <div className="catmodal-athlete" key={p.participantId}>
                <div className="catmodal-athlete-head">
                  <span className="ctry">{p.ctry}</span>
                  <span className="nm">{p.nm}</span>
                </div>
                <div className="catmodal-bets">
                  {BET_TYPES.map(({ type, label }) => {
                    const available = type === "TOP_1" ? true : !!cotesRow;
                    if (!available) return null;
                    const val = type === "TOP_1" ? p.val : Number(cotesRow![COTE_FIELD[type]]);
                    const id = `${p.participantId}:${type}`;
                    const sel = !!coupon[id];
                    const needsInput = type === "EXACT_PLACE" || type === "EXACT_TIME" || type === "EXACT_TIME_SECOND";
                    return (
                      <button
                        key={type}
                        className={`catmodal-bet${sel ? " sel" : ""}`}
                        onClick={() => {
                          if (sel) {
                            toggle(coupon[id]);
                            return;
                          }
                          if (needsInput) {
                            setInputError("");
                            setPlaceValue("");
                            setTimeValue("");
                            setTimeSecondValue("");
                            setExpandedInput(prev =>
                              prev?.participantId === p.participantId && prev.type === type
                                ? null
                                : { participantId: p.participantId, type }
                            );
                            return;
                          }
                          toggle({
                            id, participantId: p.participantId, betType: type, betLabel: label,
                            nm: p.nm, ctry: p.ctry, note: p.note, val,
                            competitionId, categorie: selectedCat,
                          });
                        }}
                      >
                        <span className="lb">{label}</span>
                        <span className="vl">{val.toFixed(2)}</span>
                      </button>
                    );
                  })}
                  {!p.codeBateau && (
                    <span className="catmodal-note">Cotes avancées indisponibles</span>
                  )}
                </div>

                {expandedInput?.participantId === p.participantId && expandedInput.type === "EXACT_PLACE" && cotesRow && (
                  <div className="catmodal-inline-input">
                    <input
                      type="number"
                      min={2}
                      max={50}
                      placeholder="N° de place (ex: 6)"
                      value={placeValue}
                      onChange={(e) => { setPlaceValue(e.target.value); setInputError(""); }}
                    />
                    {(() => {
                      const parsed = parseInt(placeValue, 10);
                      if (Number.isInteger(parsed) && parsed >= 2 && parsed <= 50) {
                        return <span className="catmodal-inline-cote">cote {dynamicPlaceCote(cotesRow, parsed).toFixed(2)}</span>;
                      }
                      return null;
                    })()}
                    <button
                      className="catmodal-inline-confirm"
                      onClick={() => {
                        const parsed = parseInt(placeValue, 10);
                        if (!Number.isInteger(parsed) || parsed < 2) {
                          setInputError("Place 1 = utilise plutôt le pari Vainqueur");
                          return;
                        }
                        if (parsed > 50) {
                          setInputError("Place invalide");
                          return;
                        }
                        const val = dynamicPlaceCote(cotesRow, parsed);
                        toggle({
                          id: `${p.participantId}:EXACT_PLACE`, participantId: p.participantId, betType: "EXACT_PLACE",
                          betLabel: `Place exacte n°${parsed}`, nm: p.nm, ctry: p.ctry, note: p.note, val,
                          competitionId, categorie: selectedCat, targetPlace: parsed,
                        });
                        setExpandedInput(null);
                      }}
                    >
                      Valider
                    </button>
                    {inputError && <span className="catmodal-inline-err">{inputError}</span>}
                  </div>
                )}

                {expandedInput?.participantId === p.participantId && expandedInput.type === "EXACT_TIME" && (
                  <div className="catmodal-inline-input">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Temps en secondes (ex: 83.4)"
                      value={timeValue}
                      onChange={(e) => { setTimeValue(e.target.value); setInputError(""); }}
                    />
                    <button
                      className="catmodal-inline-confirm"
                      onClick={() => {
                        const parsed = parseFloat(timeValue);
                        if (!Number.isFinite(parsed) || parsed <= 0) {
                          setInputError("Temps invalide");
                          return;
                        }
                        const rounded = Math.round(parsed * 10) / 10;
                        const val = Number(cotesRow![COTE_FIELD.EXACT_TIME]);
                        toggle({
                          id: `${p.participantId}:EXACT_TIME`, participantId: p.participantId, betType: "EXACT_TIME",
                          betLabel: `Temps au dixième : ${rounded}s`, nm: p.nm, ctry: p.ctry, note: p.note, val,
                          competitionId, categorie: selectedCat, predictedTimeSeconds: rounded,
                        });
                        setExpandedInput(null);
                      }}
                    >
                      Valider
                    </button>
                    {inputError && <span className="catmodal-inline-err">{inputError}</span>}
                  </div>
                )}

                {expandedInput?.participantId === p.participantId && expandedInput.type === "EXACT_TIME_SECOND" && (
                  <div className="catmodal-inline-input">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Temps en secondes entières (ex: 83)"
                      value={timeSecondValue}
                      onChange={(e) => { setTimeSecondValue(e.target.value); setInputError(""); }}
                    />
                    <button
                      className="catmodal-inline-confirm"
                      onClick={() => {
                        const parsed = parseInt(timeSecondValue, 10);
                        if (!Number.isInteger(parsed) || parsed <= 0) {
                          setInputError("Temps invalide");
                          return;
                        }
                        const val = Number(cotesRow![COTE_FIELD.EXACT_TIME_SECOND]);
                        toggle({
                          id: `${p.participantId}:EXACT_TIME_SECOND`, participantId: p.participantId, betType: "EXACT_TIME_SECOND",
                          betLabel: `Temps à la seconde : ${parsed}s`, nm: p.nm, ctry: p.ctry, note: p.note, val,
                          competitionId, categorie: selectedCat, predictedTimeSeconds: parsed,
                        });
                        setExpandedInput(null);
                      }}
                    >
                      Valider
                    </button>
                    {inputError && <span className="catmodal-inline-err">{inputError}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      </div>

      {couponCount > 0 && (
        <div className="catmodal-foot">
          <button className="catmodal-foot-btn" onClick={onOpenCoupon}>
            <span className="n">{couponCount} sélection{couponCount > 1 ? "s" : ""}</span>
            <span className="go">Voir mon coupon</span>
          </button>
        </div>
      )}

      <OddsInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <AlgoBetaInfoModal open={betaInfoOpen} onClose={() => setBetaInfoOpen(false)} />
    </>
  );
}
