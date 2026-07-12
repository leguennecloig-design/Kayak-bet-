"use client";

import { useState } from "react";

export type IgRewardStatus = "loading" | "none" | "pending" | "approved" | "rejected" | "unavailable";

const InstaIcon = () => <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>;

export default function InstagramRewardCard({
  status,
  busy,
  onRequest,
  style,
}: {
  status: IgRewardStatus;
  busy: boolean;
  onRequest: (handle: string) => void;
  style?: React.CSSProperties;
}) {
  const [handle, setHandle] = useState("");

  if (status === "loading" || status === "unavailable") return null;

  return (
    <div className="profil-section" style={style}>
      <div className="profil-section-head">
        <span className="ps-head-ic"><InstaIcon /> Bonus Instagram</span>
      </div>

      {status === "approved" ? (
        <p style={{ color: "var(--soft)", fontFamily: "var(--font-archivo)", fontSize: "12.5px", margin: 0 }}>
          Récompense obtenue · merci de nous suivre ✓
        </p>
      ) : status === "pending" ? (
        <p style={{ color: "var(--soft)", fontFamily: "var(--font-archivo)", fontSize: "12.5px", margin: 0 }}>
          Demande envoyée · en attente de validation. On vérifie ton abonnement et tu recevras tes 500 crédits. 🔎
        </p>
      ) : (
        <>
          <p style={{ color: "var(--soft)", fontFamily: "var(--font-archivo)", fontSize: "12.5px", margin: "0 0 13px" }}>
            {status === "rejected"
              ? "Demande refusée (abonnement non trouvé). Abonne-toi puis renvoie ta demande avec ton pseudo Instagram."
              : "Abonne-toi à notre compte Instagram, indique ton pseudo, et récupère 500 crédits après vérification."}
          </p>
          <div className="ig-reward-form">
            <a
              className="profil-edit-btn"
              href="https://www.instagram.com/kayakbet/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Suivre @kayakbet
            </a>
            <input
              className="ig-reward-input"
              type="text"
              placeholder="Ton pseudo Instagram"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <button
              className="profil-edit-btn"
              disabled={busy || !handle.trim()}
              onClick={() => onRequest(handle.trim())}
            >
              {busy ? "…" : "Envoyer ma demande"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
