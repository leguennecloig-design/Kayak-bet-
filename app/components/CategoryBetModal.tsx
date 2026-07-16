"use client";

import { useEffect, useState } from "react";
import type { BetType } from "@/lib/algo/types";
import { probExactPlace, probToCote, ALGO_PARAMS } from "@/lib/algo/bradley-terry";
import OddsInfoModal from "./OddsInfoModal";
import QualifOddsInfoModal from "./QualifOddsInfoModal";
import AlgoBetaInfoModal from "./AlgoBetaInfoModal";
import CompetitionReferralModal from "./CompetitionReferralModal";

const BETA_INFO_SEEN_KEY = "kb_algo_beta_seen_v1";
const COMBO_INFO_SEEN_KEY = "kb_combo_info_seen_v1";
const COMP_REFERRAL_SEEN_KEY = "kb_comp_referral_seen_v1";
const QUALIF_INFO_SEEN_KEY = "kb_qualif_info_seen_v1";

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
  qualifiesFinale?: number | null; // compétition qualif uniquement — nb de qualifiés en finale pour cette catégorie
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

// Compétition qualif → finale : un seul marché possible, pas de Top3/5/exact
// place/temps (voir competitions.marche_qualif_finale).
const QUALIF_BET_TYPES: { type: BetType; label: string }[] = [
  { type: "QUALIF_FINALE", label: "Qualif finale" },
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
  QUALIF_FINALE: "cote_top1", // jamais lu : voir "always" ci-dessous (val = p.val)
};

// Types dont la cote vient directement de `p.val` (participants.cote), sans
// besoin de la ligne `cotes` (recalcul avancé) — Vainqueur ET Qualif finale.
function isAlwaysAvailable(type: BetType): boolean {
  return type === "TOP_1" || type === "QUALIF_FINALE";
}

const TYPE_LABEL: Record<string, string> = { sprint: "Sprint", classique: "Classique" };

type Props = {
  onBack: () => void;
  competitionId: string;
  competitionNom: string;
  odds: BetOdd[]; // toutes catégories confondues — la startlist complète de la compétition
  typeCompetition?: string | null;
  parisOuvertsA?: string | null;
  marcheQualifFinale?: boolean;
  coupon: Record<string, BetOdd>;
  toggle: (o: BetOdd) => void;
  couponCount: number;
  onOpenCoupon: () => void;
  onOpenComboInfo?: () => void;
  referralCode?: string | null;
};

function fmtOpensAt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export default function CategoryBetModal({
  onBack, competitionId, competitionNom, odds, typeCompetition, parisOuvertsA, marcheQualifFinale, coupon, toggle, couponCount, onOpenCoupon, onOpenComboInfo, referralCode,
}: Props) {
  const [selectedCat, setSelectedCat] = useState("");
  const [search, setSearch] = useState("");
  const [cotes, setCotes] = useState<CotesRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [betaInfoOpen, setBetaInfoOpen] = useState(false);
  const [qualifInfoOpen, setQualifInfoOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(
    parisOuvertsA && new Date(parisOuvertsA).getTime() > Date.now() ? parisOuvertsA : null
  );

  // Pop-ups d'info affichées une seule fois chacune (mémorisées en
  // localStorage), jamais deux en même temps — chacune attend son tour au
  // prochain passage si une précédente vient de s'afficher : qualif (si
  // compétition qualif), puis bêta/algo, puis pari combiné (partagée avec le
  // coupon, voir onOpenComboInfo), puis parrainage compétition.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (marcheQualifFinale && !window.localStorage.getItem(QUALIF_INFO_SEEN_KEY)) {
      setQualifInfoOpen(true);
      window.localStorage.setItem(QUALIF_INFO_SEEN_KEY, "1");
      return;
    }
    if (!window.localStorage.getItem(BETA_INFO_SEEN_KEY)) {
      setBetaInfoOpen(true);
      window.localStorage.setItem(BETA_INFO_SEEN_KEY, "1");
      return;
    }
    if (onOpenComboInfo && !window.localStorage.getItem(COMBO_INFO_SEEN_KEY)) {
      onOpenComboInfo();
      window.localStorage.setItem(COMBO_INFO_SEEN_KEY, "1");
      return;
    }
    if (!window.localStorage.getItem(COMP_REFERRAL_SEEN_KEY)) {
      setReferralModalOpen(true);
      window.localStorage.setItem(COMP_REFERRAL_SEEN_KEY, "1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const qualifiesFinaleForCat = odds.find(o => o.categorie === selectedCat)?.qualifiesFinale ?? null;

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
            {marcheQualifFinale && qualifiesFinaleForCat != null && (
              <span className="catmodal-type"> · {qualifiesFinaleForCat} qualifié{qualifiesFinaleForCat > 1 ? "s" : ""} en finale</span>
            )}
          </div>
          <h3>{competitionNom}</h3>
        </div>
        <button
          className="catmodal-back"
          aria-label="Inviter un ami sur cette compétition (+200 cr chacun)"
          onClick={() => setReferralModalOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none"><path d="M8.7 13.3a2.6 2.6 0 1 0 0-2.6M15.3 7.5a2.6 2.6 0 1 0 0 2.6M15.3 16.4a2.6 2.6 0 1 0 0-2.6M9.7 11.7l5.6-3.2M9.7 12.3l5.6 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
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
                  {(marcheQualifFinale ? QUALIF_BET_TYPES : BET_TYPES).map(({ type, label }) => {
                    const available = isAlwaysAvailable(type) ? true : !!cotesRow;
                    if (!available) return null;
                    const val = isAlwaysAvailable(type) ? p.val : Number(cotesRow![COTE_FIELD[type]]);
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

      {marcheQualifFinale
        ? <QualifOddsInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        : <OddsInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />}
      <QualifOddsInfoModal open={qualifInfoOpen} onClose={() => setQualifInfoOpen(false)} />
      <AlgoBetaInfoModal open={betaInfoOpen} onClose={() => setBetaInfoOpen(false)} />
      <CompetitionReferralModal
        open={referralModalOpen}
        onClose={() => setReferralModalOpen(false)}
        competitionId={competitionId}
        myReferralCode={referralCode ?? null}
      />
    </>
  );
}
