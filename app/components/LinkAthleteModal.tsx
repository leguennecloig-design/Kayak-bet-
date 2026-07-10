"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

type AthleteResult = {
  id: string;
  nom: string;
  prenom: string | null;
  club: string | null;
  categorie: string | null;
  rangNational: number | null;
  claimed: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onLinked: (athlete: { id: string; nom: string; prenom: string | null; club: string | null; categorie: string | null }) => void;
};

export default function LinkAthleteModal({ open, onClose, onLinked }: Props) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const [results, setResults] = useState<AthleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<AthleteResult | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) { setQuery(""); setResults([]); setConfirming(null); setError(""); }
  }, [open]);

  // Ne dépend que de `open` (voir EditProfileModal pour le pourquoi) : sinon
  // le focus-grab se relance à chaque re-render du parent (ex: le compte à
  // rebours qui tick toutes les secondes) et vole le focus du champ de recherche.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || debounced.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/athletes/search?q=${encodeURIComponent(debounced)}`)
      .then(res => res.json())
      .then((data) => { if (!cancelled) setResults(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, debounced]);

  if (!open) return null;

  async function confirm() {
    if (!confirming) return;
    setClaiming(true);
    setError("");
    try {
      const { data, error: rpcErr } = await supabase.rpc("claim_athlete", { athlete_uuid: confirming.id });
      if (rpcErr) throw rpcErr;
      if (!data?.ok) {
        setError(
          data?.error === "already_claimed"
            ? "Cet athlète a déjà été revendiqué par un autre compte."
            : data?.error === "already_linked_other"
            ? "Tu as déjà lié un profil athlète. Contacte le support pour le modifier."
            : "Impossible de lier ce profil."
        );
        setConfirming(null);
        return;
      }
      onLinked({ id: confirming.id, nom: confirming.nom, prenom: confirming.prenom, club: confirming.club, categorie: confirming.categorie });
      onClose();
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lier mon profil athlète"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Lier mon profil athlète</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body">
          {error && <p className="catmodal-status err">{error}</p>}

          {!confirming ? (
            <>
              <input
                type="text"
                className="linkathlete-search"
                placeholder="Chercher ton nom…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading ? (
                <p className="catmodal-status">Recherche…</p>
              ) : query.trim().length < 2 ? (
                <p className="catmodal-status">Tape au moins 2 lettres</p>
              ) : results.length === 0 ? (
                <p className="catmodal-status">Aucun athlète trouvé</p>
              ) : (
                <div className="linkathlete-list">
                  {results.map((a) => (
                    <button key={a.id} className="linkathlete-row" onClick={() => setConfirming(a)}>
                      <b>{a.prenom} {a.nom}</b>
                      <span>{a.club ?? "Circuit national"} · {a.categorie ?? ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="linkathlete-row selected">
                <b>{confirming.prenom} {confirming.nom}</b>
                <span>{confirming.club ?? "Circuit national"} · {confirming.categorie ?? ""}{confirming.rangNational ? ` · Rang national ${confirming.rangNational}` : ""}</span>
              </div>
              <div className="linkathlete-actions">
                <button className="linkathlete-skip" onClick={() => setConfirming(null)}>Ce n&apos;est pas moi</button>
                <button className="editprofile-save" disabled={claiming} onClick={confirm}>
                  {claiming ? "Confirmation…" : "Confirmer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
