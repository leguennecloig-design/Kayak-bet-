"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Pop-up d'aide accessible depuis le coupon : comment parier, et la
// différence entre un pari simple et un pari combiné.
export default function CouponInfoModal({ open, onClose }: Props) {
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
        aria-label="Comment parier"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Comment parier ?</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body algo-info-body">
          <h4>1. Choisir un pronostic</h4>
          <p>
            Depuis une compétition, tape sur une cote (Vainqueur, Top 3, Place exacte…) —
            elle s&apos;ajoute à ton coupon, en bas de l&apos;écran.
          </p>

          <h4>2. Pari simple</h4>
          <p>
            Un seul pronostic dans le coupon. Tu mises un montant, et si ton pronostic est
            juste, tu remportes <b>mise × cote</b>.
          </p>

          <h4>3. Pari combiné</h4>
          <p>
            Ajoute plusieurs pronostics (sur des athlètes différents) puis active la case
            <b> « Pari combiné »</b> avant de valider. Leurs cotes se multiplient entre elles,
            <b> et un bonus s&apos;ajoute au gain</b> selon le nombre de sélections (plafonné,
            pour que ça reste raisonnable) — la récompense du risque pris.
          </p>
          <p>
            Attention : dans un combiné, <b>tous les pronostics doivent être justes</b> pour
            que le pari soit gagnant. Si un seul se plante, le pari entier est perdu.
          </p>

          <h4>4. Règles</h4>
          <ul>
            <li>Un seul pari en attente par athlète à la fois.</li>
            <li>Un seul pronostic « Vainqueur » par catégorie (un seul athlète peut gagner une course).</li>
            <li>Au plus 3 pronostics « Top 3 », 5 « Top 5 » et 10 « Top 10 » par catégorie — pas plus que de places disponibles dans le marché.</li>
            <li>Mise minimum 30 cr.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
