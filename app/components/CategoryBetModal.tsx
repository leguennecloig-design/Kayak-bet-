"use client";

import { useEffect, useRef, useState } from "react";
import type { BetType } from "@/lib/algo/types";

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
};

type CotesRow = {
  code_bateau: string;
  nom: string;
  categorie: string;
  cote_top1: number;
  cote_top3: number;
  cote_top5: number;
  cote_top10: number;
  cote_top20: number;
  cote_exact_place: number;
  cote_exact_time: number;
};

const BET_TYPES: { type: BetType; label: string }[] = [
  { type: "TOP_1", label: "Vainqueur" },
  { type: "TOP_3", label: "Top 3" },
  { type: "TOP_5", label: "Top 5" },
  { type: "TOP_10", label: "Top 10" },
  { type: "TOP_20", label: "Top 20" },
  { type: "EXACT_PLACE", label: "Place exacte" },
  { type: "EXACT_TIME", label: "Temps exact" },
];

const COTE_FIELD: Record<BetType, keyof CotesRow> = {
  TOP_1: "cote_top1",
  TOP_3: "cote_top3",
  TOP_5: "cote_top5",
  TOP_10: "cote_top10",
  TOP_20: "cote_top20",
  EXACT_PLACE: "cote_exact_place",
  EXACT_TIME: "cote_exact_time",
};

type Props = {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  competitionNom: string;
  categorie: string;
  participants: BetOdd[]; // odds "Vainqueur" déjà chargés pour cette catégorie
  coupon: Record<string, BetOdd>;
  toggle: (o: BetOdd) => void;
};

export default function CategoryBetModal({
  open, onClose, competitionId, competitionNom, categorie, participants, coupon, toggle,
}: Props) {
  const [cotes, setCotes] = useState<CotesRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/competitions/${competitionId}/cotes?categorie=${encodeURIComponent(categorie)}`)
      .then(res => res.json())
      .then((data) => { if (!cancelled) setCotes(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError("Impossible de charger les cotes."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, competitionId, categorie]);

  // Ne dépend que de `open` — voir EditProfileModal pour le pourquoi (sinon
  // le re-render périodique du parent, ex: le compte à rebours, relance ce
  // focus-grab en boucle).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const cotesByCode = new Map((cotes ?? []).map(c => [c.code_bateau, c]));

  return (
    <div className="catmodal-scrim" onClick={onClose}>
      <div
        className="catmodal"
        role="dialog"
        aria-modal="true"
        aria-label={`Paris ${categorie} — ${competitionNom}`}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="catmodal-head">
          <div>
            <div className="catmodal-cat">{categorie}</div>
            <h3>{competitionNom}</h3>
          </div>
          <button className="catmodal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="catmodal-body">
          {loading && <p className="catmodal-status">Chargement des cotes…</p>}
          {!loading && error && <p className="catmodal-status err">{error}</p>}
          {!loading && !error && participants.length === 0 && (
            <p className="catmodal-status">Aucun participant dans cette catégorie.</p>
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
                    return (
                      <button
                        key={type}
                        className={`catmodal-bet${sel ? " sel" : ""}`}
                        onClick={() => toggle({
                          id, participantId: p.participantId, betType: type, betLabel: label,
                          nm: p.nm, ctry: p.ctry, note: p.note, val,
                          competitionId, categorie,
                        })}
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
