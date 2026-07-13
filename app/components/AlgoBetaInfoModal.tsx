"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Pop-up affiché la première fois qu'un joueur ouvre une compétition pour
// parier (voir CategoryBetModal — gated par localStorage, une seule fois) :
// transparence sur le fait que l'algo de cotes est en bêta + comment les
// cotes sont calculées + contact Instagram pour les suggestions.
export default function AlgoBetaInfoModal({ open, onClose }: Props) {
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
        aria-label="Comment sont calculées les cotes"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Cotes &amp; version bêta</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body algo-info-body">
          <div className="algo-info-badge">🧪 Version bêta — l&apos;algo est encore en cours de travail</div>

          <p>
            Sur Kayakbet, les cotes ne sont pas données au hasard : elles sont calculées à
            partir de données officielles de la FFCK, avec un algorithme conçu pour rester
            lisible, cohérent et pas trop dur avec les outsiders. Voici comment ça marche,
            en toute transparence.
          </p>

          <h4>1. Les sources de données</h4>
          <p>Pour estimer le niveau de chaque athlète, on croise trois types de données officielles :</p>
          <ul>
            <li><b>Le classement numérique national 2026</b> : le classement FFCK à jour, par catégorie.</li>
            <li><b>Les résultats des courses nationales de la saison</b> : plusieurs courses sont prises en compte, pas une seule — ça évite qu&apos;un mauvais jour isolé plombe une cote.</li>
            <li><b>Les résultats des sélections Équipe de France</b> (quand il y en a) : pour la catégorie M22, ce résultat compte plus lourd, car c&apos;est le niveau de référence le plus fiable pour cette tranche d&apos;âge.</li>
          </ul>
          <p>Seules les données de la saison 2026 sont utilisées.</p>

          <h4>2. Un score composite par athlète</h4>
          <p>Chaque athlète reçoit un score qui combine ces sources, avec des poids différents selon les cas :</p>
          <ul>
            <li><b>Cas standard</b> : le classement numérique compte pour un peu plus de la moitié du score, le reste vient des résultats en course nationale.</li>
            <li><b>Cas M22 avec sélection Équipe de France</b> : la sélection devient la source la plus lourde, le numérique et le national complètent.</li>
          </ul>
          <p>
            Le numérique pèse plus lourd car c&apos;est la mesure la plus stable dans le temps : elle
            agrège toute la saison, alors qu&apos;une seule course peut être faussée par un coup de
            chance ou de malchance (dessalage, matériel, météo…).
          </p>

          <h4>3. Du score à la probabilité</h4>
          <p>
            Une fois chaque athlète noté, on simule la course un grand nombre de fois (plusieurs
            milliers de tirages) avec un modèle probabiliste classique en sport. À chaque tirage,
            les mieux notés ont plus de chances de finir devant, mais rien n&apos;est jamais garanti
            à 100 % — comme dans la vraie vie. On obtient ainsi une probabilité réelle de finir
            Top 1, Top 3, Top 5 ou Top 10.
          </p>
          <p>La cote, c&apos;est simplement l&apos;inverse de cette probabilité (arrondi) : plus la probabilité est haute, plus la cote est basse.</p>

          <h4>4. Des cotes qui restent raisonnables</h4>
          <p>Pour éviter les cotes absurdes, plusieurs garde-fous s&apos;appliquent :</p>
          <ul>
            <li><b>Des plafonds absolus</b> : aucune cote ne peut dépasser un certain seuil, différent selon le type de pari — plus le pari est facile, plus le plafond est bas.</li>
            <li><b>Des ajustements progressifs selon le niveau réel</b> : un athlète bien classé, ou qui a déjà fait un bon résultat en national, voit sa cote plafonnée plus bas — en douceur, pas par palier brutal.</li>
            <li><b>La position de départ</b> : en descente, les meilleurs partent traditionnellement en fin de liste — un signal supplémentaire.</li>
            <li><b>Un lissage pour les grosses catégories</b> : dans les catégories à fort effectif, la seule taille du peloton ne doit pas artificiellement gonfler toutes les cotes.</li>
          </ul>

          <h4>5. Ce qu&apos;on ne prend pas en compte</h4>
          <ul>
            <li>Les athlètes étrangers ne sont pas inclus dans les pronostics (pas de données FFCK fiables).</li>
            <li>Les ouvreurs ne sont pas pris en compte : ils ne courent pas pour le classement.</li>
          </ul>

          <h4>En résumé</h4>
          <p>
            Les cotes Kayakbet reflètent une estimation statistique basée sur des données
            publiques FFCK. Ce n&apos;est ni une martingale ni une prédiction garantie : c&apos;est un
            outil pour donner du relief aux pronostics de la communauté, pas un pari d&apos;argent réel.
          </p>

          <a
            className="algo-info-contact"
            href="https://www.instagram.com/kayakbet/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Une idée d&apos;amélioration ? Écris-moi sur Instagram @kayakbet
          </a>
        </div>
      </div>
    </div>
  );
}
