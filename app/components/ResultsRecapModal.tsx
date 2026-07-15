"use client";

import { useEffect, useRef } from "react";

export type RecapBet = {
  id: string;
  athlete: string;
  event: string;
  result: "win" | "loss";
  stake: number;
  gainReel: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  bets: RecapBet[];
  onGoToProfile: () => void;
};

// Pop-up "Résultats disponibles" : affichée dès qu'un ou plusieurs paris en
// attente viennent d'être réglés (gagné/perdu) depuis la dernière visite —
// résume les gains/pertes sans avoir à aller chercher dans l'historique.
// Déclenchée par DashboardPage (voir kb_results_seen_at) et pointée par les
// notifications "Pari gagné/perdu" (url /app?view=profil).
export default function ResultsRecapModal({ open, onClose, bets, onGoToProfile }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open || bets.length === 0) return null;

  const wins = bets.filter(b => b.result === "win");
  const losses = bets.filter(b => b.result === "loss");
  const totalWon = wins.reduce((t, b) => t + (b.gainReel ?? 0), 0);
  const totalLost = losses.reduce((t, b) => t + b.stake, 0);

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal results-recap-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Résultats disponibles"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Résultats disponibles</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="kb-modal-body results-recap-body">
          <p className="results-recap-summary">
            {wins.length > 0 && <span className="win">+{Math.round(totalWon).toLocaleString("fr-FR")} cr.</span>}
            {wins.length > 0 && losses.length > 0 && <span className="sep"> · </span>}
            {losses.length > 0 && <span className="loss">-{Math.round(totalLost).toLocaleString("fr-FR")} cr.</span>}
          </p>
          <div className="results-recap-list">
            {bets.map(b => (
              <div key={b.id} className={`results-recap-row ${b.result}`}>
                <span className={`dot ${b.result}`} />
                <div className="body">
                  <span className="nm">{b.athlete}</span>
                  <span className="ev">{b.event}</span>
                </div>
                <span className={`amt ${b.result}`}>
                  {b.result === "win" ? `+${Math.round(b.gainReel ?? 0).toLocaleString("fr-FR")}` : `-${b.stake.toLocaleString("fr-FR")}`}
                </span>
              </div>
            ))}
          </div>
          <button className="nudge-cta" onClick={onGoToProfile}>Voir mon profil</button>
          <button className="nudge-later" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
