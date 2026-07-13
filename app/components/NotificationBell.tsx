"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

type Incoming = {
  friendshipId: string;
  userId: string;
  username: string;
  initials: string;
  avatarUrl: string | null;
};

const BellSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 10.5a6 6 0 0 1 12 0c0 3.6 1 5 2 6H4c1-1 2-2.4 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9.7 19.5a2.3 2.3 0 0 0 4.6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

// Bell de notifications : cloche + badge dans le header, ouvre un panneau avec
// les demandes d'amis à approuver + le fil d'activité (parrainage, amis…).
export default function NotificationBell({ onFriendsChanged }: { onFriendsChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, fRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/friends"),
      ]);
      const nData = nRes.ok ? await nRes.json() : { notifications: [], unread: 0 };
      const fData = fRes.ok ? await fRes.json() : { incoming: [] };
      setNotifs(nData.notifications ?? []);
      setUnread(nData.unread ?? 0);
      setIncoming(fData.incoming ?? []);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial + rafraîchissement périodique léger (60s).
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  // Ouverture auto quand on arrive via un clic de push (?notif=friends).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("notif")) {
      setOpen(true);
      // nettoie l'URL sans recharger
      p.delete("notif");
      const qs = p.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  // Fermeture au clavier (Échap) — cohérent avec les autres popups de l'app.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const badge = unread + incoming.length;

  async function openPanel() {
    setOpen(true);
    await load();
    // marque les notifs comme lues (les demandes d'amis restent en attente tant
    // qu'elles ne sont pas traitées, gérées séparément).
    if (unread > 0) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      }).then(() => setUnread(0));
    }
  }

  async function respond(friendshipId: string, action: "accept" | "decline") {
    setBusyId(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setIncoming(prev => prev.filter(i => i.friendshipId !== friendshipId));
        onFriendsChanged?.();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <button className="notif-bell" onClick={openPanel} aria-label="Notifications" title="Notifications">
        <BellSvg />
        {badge > 0 && <span className="notif-bell-badge">{badge > 9 ? "9+" : badge}</span>}
      </button>

      {open && (
        <div className="kb-modal-scrim" onClick={() => setOpen(false)}>
          <div
            className="kb-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            tabIndex={-1}
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kb-modal-head">
              <h3>Notifications</h3>
              <button className="kb-modal-close" aria-label="Fermer" onClick={() => setOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="kb-modal-body">
              {incoming.length > 0 && (
                <div className="notif-friends">
                  <div className="notif-sec-title">Demandes d&apos;amis · {incoming.length}</div>
                  {incoming.map(i => (
                    <div key={i.friendshipId} className="notif-friend-row">
                      <div className="notif-friend-av">
                        {i.avatarUrl ? <img src={i.avatarUrl} alt="" /> : <span>{i.initials}</span>}
                      </div>
                      <span className="notif-friend-nm">{i.username}</span>
                      <div className="notif-friend-actions">
                        <button
                          className="notif-btn-refuse"
                          disabled={busyId === i.friendshipId}
                          onClick={() => respond(i.friendshipId, "decline")}
                        >
                          Refuser
                        </button>
                        <button
                          className="notif-btn-accept"
                          disabled={busyId === i.friendshipId}
                          onClick={() => respond(i.friendshipId, "accept")}
                        >
                          {busyId === i.friendshipId ? "…" : "Accepter"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="notif-sec-title" style={{ marginTop: incoming.length > 0 ? 18 : 0 }}>Activité</div>
              {loading && notifs.length === 0 ? (
                <p className="notif-empty">Chargement…</p>
              ) : notifs.length === 0 ? (
                <p className="notif-empty">
                  {incoming.length > 0 ? "Aucune autre activité." : "Aucune notification pour l'instant."}
                </p>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className={`notif-item${n.read_at == null ? " unread" : ""}`}>
                    <div className="notif-item-txt">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-body">{n.body}</div>
                    </div>
                    <div className="notif-item-time">{timeAgo(n.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
