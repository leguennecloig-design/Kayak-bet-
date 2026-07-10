"use client";

import { useEffect, useState } from "react";
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

const TYPE_LABEL: Record<string, string> = { sprint: "Sprint", classique: "Classique" };

type Props = {
  onBack: () => void;
  competitionId: string;
  competitionNom: string;
  odds: BetOdd[]; // toutes catégories confondues — la startlist complète de la compétition
  typeCompetition?: string | null;
  coupon: Record<string, BetOdd>;
  toggle: (o: BetOdd) => void;
  couponCount: number;
  onOpenCoupon: () => void;
};

export default function CategoryBetModal({
  onBack, competitionId, competitionNom, odds, typeCompetition, coupon, toggle, couponCount, onOpenCoupon,
}: Props) {
  const [selectedCat, setSelectedCat] = useState("");
  const [cotes, setCotes] = useState<CotesRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (!selectedCat) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/competitions/${competitionId}/cotes?categorie=${encodeURIComponent(selectedCat)}`)
      .then(res => res.json())
      .then((data) => { if (!cancelled) setCotes(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setError("Impossible de charger les cotes."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [competitionId, selectedCat]);

  const cotesByCode = new Map((cotes ?? []).map(c => [c.code_bateau, c]));
  const participants = odds.filter(o => o.categorie === selectedCat);

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
        <span className="catmodal-spacer" />
      </div>

      <div className="catmodal-scroll">
        {cats.length > 1 && (
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
                          competitionId, categorie: selectedCat,
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

      {couponCount > 0 && (
        <div className="catmodal-foot">
          <button className="catmodal-foot-btn" onClick={onOpenCoupon}>
            <span className="n">{couponCount} sélection{couponCount > 1 ? "s" : ""}</span>
            <span className="go">Voir mon coupon</span>
          </button>
        </div>
      )}
    </>
  );
}
