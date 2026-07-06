"use client";

import { useEffect, useRef, useState } from "react";
import AvatarUpload from "./AvatarUpload";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  initials: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  onSaved: (updates: { username?: string; avatarUrl?: string; bio?: string }) => void;
};

export default function EditProfileModal({
  open, onClose, userId, initials, username, avatarUrl, bio, onSaved,
}: Props) {
  const [localAvatar, setLocalAvatar] = useState(avatarUrl);
  const [localUsername, setLocalUsername] = useState(username);
  const [localBio, setLocalBio] = useState(bio);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLocalAvatar(avatarUrl);
      setLocalUsername(username);
      setLocalBio(bio);
      setError("");
    }
  }, [open, avatarUrl, username, bio]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const usernameValid = USERNAME_RE.test(localUsername);

  async function handleSave() {
    if (!usernameValid) {
      setError("Pseudo invalide : 3 à 20 caractères, lettres/chiffres/underscore uniquement");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updates: { username?: string; bio?: string } = {};
      if (localUsername !== username) updates.username = localUsername;
      if (localBio !== bio) updates.bio = localBio;

      for (const [key, value] of Object.entries(updates)) {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Erreur");
        }
      }

      onSaved({ username: localUsername, bio: localBio, avatarUrl: localAvatar ?? undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="catmodal-scrim" onClick={onClose}>
      <div
        className="catmodal editprofile"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier le profil"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="catmodal-head">
          <h3>Modifier le profil</h3>
          <button className="catmodal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="catmodal-body">
          <div className="editprofile-avatar-row">
            <AvatarUpload
              userId={userId}
              avatarUrl={localAvatar}
              initials={initials}
              onUploaded={setLocalAvatar}
            />
          </div>

          <label className="editprofile-field">
            <span>Pseudo</span>
            <input
              type="text"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              maxLength={20}
            />
            {!usernameValid && localUsername.length > 0 && (
              <span className="editprofile-hint">3-20 caractères, lettres/chiffres/underscore</span>
            )}
          </label>

          <label className="editprofile-field">
            <span>Bio</span>
            <textarea
              value={localBio}
              onChange={(e) => setLocalBio(e.target.value.slice(0, 280))}
              maxLength={280}
              rows={3}
            />
            <span className="editprofile-counter">{280 - localBio.length}</span>
          </label>

          {error && <p className="catmodal-status err">{error}</p>}

          <button className="editprofile-save" onClick={handleSave} disabled={saving || !usernameValid}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
