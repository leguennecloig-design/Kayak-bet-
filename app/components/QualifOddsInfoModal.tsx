"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Explication des cotes pour une compétition QUALIF (manche de qualification
// avant une finale séparée) — méthodologie différente de l'algo v4 habituel
// (voir CategoryBetModal.tsx, competitions.marche_qualif_finale), affichée à
// la place de OddsInfoModal pour ce type de compétition.
export default function QualifOddsInfoModal({ open, onClose }: Props) {
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

  if (!open) return null;

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Comprendre les cotes qualif"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Comprendre les cotes qualif</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body odds-info-body">
          <p>
            Cette compétition est une <b>manche de qualification</b> : un nombre
            précis d&apos;athlètes se qualifie pour la finale dans chaque catégorie
            (affiché à côté du nom de la catégorie). Le seul pari possible ici est
            « <b>Qualif finale</b> » : l&apos;athlète fait-il partie des qualifiés ?
          </p>

          <div className="odds-info-types">
            <div className="odds-info-type"><b>Qualif finale</b><span>L&apos;athlète termine assez bien classé dans cette manche pour se qualifier pour la finale (quota fixe par catégorie).</span></div>
          </div>

          <p>
            Les cotes sont basées sur le classement national sprint et le classement
            numérique de l&apos;athlète. Pour les catégories M22, elles s&apos;appuient en plus
            sur les pigues/sélections Équipe de France, le classement numérique n&apos;étant
            pas utilisé pour ces catégories.
          </p>

          <p className="odds-info-note">
            Un seul pari en attente par athlète à la fois. Active le pari combiné dans ton
            coupon pour miser sur plusieurs pronostics en même temps.
          </p>
        </div>
      </div>
    </div>
  );
}
