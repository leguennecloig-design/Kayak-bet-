"use client";

import { useEffect, useRef, useState } from "react";

type AthleteRow = {
  rang:          number | null;
  dossard:       number;
  nom:           string;
  club:          string;
  code_nation:   string;
  temps_display: string;
};
type EpreuveGroup = { etat: number; athletes: AthleteRow[] };
type CompGroup = {
  key:           string;
  nom:           string;
  ville:         string;
  code_activite: string;
  epreuves:      Record<string, EpreuveGroup>;
  synced_at:     string;
};

const ETAT_LABEL: Record<number, string> = {
  3: "En cours",
  4: "Officieux",
};

const POLL_INTERVAL = 30_000; // 30s

export default function LiveSection() {
  const [data,        setData]        = useState<CompGroup[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selEpreuve,  setSelEpreuve]  = useState<Record<string, string>>({});
  const [lastSync,    setLastSync]    = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  async function fetchLive() {
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      if (!res.ok) return;
      const json: CompGroup[] = await res.json();
      setData(json);
      if (json.length) setLastSync(json[0].synced_at);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) return null;
  if (!data.length) return null;

  function fmtSyncTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  return (
    <>
      {data.map((comp) => {
        const epreuveKeys = Object.keys(comp.epreuves).sort();
        const selKey = selEpreuve[comp.key] ?? epreuveKeys[0] ?? "";
        const currentEp = comp.epreuves[selKey];
        const athletes  = currentEp?.athletes ?? [];

        return (
          <div key={comp.key} className="live-section">
            {/* Header */}
            <div className="live-header">
              <div className="live-badge">
                <span className="live-dot" />
                <span className="live-title">En direct</span>
                <span className="live-comp-name">{comp.nom}{comp.ville ? ` · ${comp.ville}` : ""}</span>
              </div>
              <span className="live-sync">Sync {fmtSyncTime(lastSync)}</span>
            </div>

            {/* Onglets épreuves */}
            {epreuveKeys.length > 1 && (
              <div className="cat-tabs" style={{ padding: "12px 20px 0", marginBottom: 0 }}>
                {epreuveKeys.map(ep => (
                  <button
                    key={ep}
                    className={`cat-tab${selKey === ep ? " active" : ""}`}
                    onClick={() => setSelEpreuve(s => ({ ...s, [comp.key]: ep }))}
                  >
                    {ep}
                    {comp.epreuves[ep].etat === 3 && (
                      <span style={{ marginLeft: 4, color: "#FF7A45", fontSize: "7px" }}>●</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Classement */}
            {athletes.length === 0 ? (
              <p className="live-empty">Aucun résultat disponible pour cette épreuve.</p>
            ) : (
              <table className="live-table">
                <tbody>
                  {athletes.map((a, i) => (
                    <tr key={a.dossard}>
                      <td className={`lv-rank${i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : ""}`}>
                        {a.rang ?? "—"}
                      </td>
                      <td className="lv-name">{a.nom}</td>
                      <td className="lv-club">{a.club || a.code_nation || "—"}</td>
                      <td className="lv-time">{a.temps_display}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Footer état */}
            <div style={{ padding: "8px 20px", borderTop: "1px solid rgba(255,122,69,.1)" }}>
              <span style={{
                fontFamily: "var(--font-grotesk)", fontWeight: 700,
                fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
                color: currentEp?.etat === 3 ? "#FF7A45" : "#a0f0a0",
              }}>
                {ETAT_LABEL[currentEp?.etat ?? 3] ?? "Live"} · {athletes.length} athlètes
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
