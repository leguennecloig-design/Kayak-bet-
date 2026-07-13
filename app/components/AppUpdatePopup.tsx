"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  version: string;
  title: string;
  changelog: string[];
  ctaLabel: string | null;
  ctaUrl: string | null;
};

function seenKey(version: string) {
  return `kb_update_seen_${version}`;
}

// Carte "Nouvelle version disponible" ancrée en bas de l'écran (pas un
// scrim plein écran) — affichée une fois par version publiée en admin
// (voir app_announcements), mémorisé en localStorage par numéro de version
// pour qu'une nouvelle version réaffiche automatiquement la carte.
export default function AppUpdatePopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/app-updates/latest")
      .then(res => res.ok ? res.json() : null)
      .then((data: Announcement | null) => {
        if (!data) return;
        if (typeof window !== "undefined" && window.localStorage.getItem(seenKey(data.version))) return;
        setAnnouncement(data);
      })
      .catch(() => {});
  }, []);

  if (!announcement || dismissed) return null;

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(seenKey(announcement!.version), "1");
    }
    setDismissed(true);
  }

  return (
    <div className="update-popup" role="dialog" aria-label={announcement.title}>
      <div className="update-popup-head">
        <div className="update-popup-icon">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="update-popup-titles">
          <span className="t">{announcement.title}</span>
          <span className="v">Version {announcement.version}</span>
        </div>
        <button className="update-popup-collapse" aria-label={collapsed ? "Déplier" : "Réduire"} onClick={() => setCollapsed(c => !c)}>
          <svg viewBox="0 0 24 24" fill="none" style={{ transform: collapsed ? "rotate(180deg)" : undefined }}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button className="update-popup-close" aria-label="Fermer" onClick={dismiss}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      {!collapsed && (
        <div className="update-popup-body">
          <span className="update-popup-section">Quoi de neuf</span>
          <ul>
            {announcement.changelog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {announcement.ctaLabel && (
            <a
              className="update-popup-cta"
              href={announcement.ctaUrl || "#"}
              onClick={dismiss}
            >
              {announcement.ctaLabel} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
