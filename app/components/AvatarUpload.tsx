"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { compressImage } from "@/lib/client/image-compress";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo avant compression
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  userId: string;
  avatarUrl: string | null;
  initials: string;
  onUploaded: (url: string) => void;
};

export default function AvatarUpload({ userId, avatarUrl, initials, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format non supporté (JPEG, PNG ou WebP uniquement)");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image trop lourde (max 10 Mo)");
      return;
    }

    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: data.publicUrl }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Échec de l'enregistrement");
      }

      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="avatar-upload">
      <button
        type="button"
        className="avatar-upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Changer l'avatar"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" />
        ) : (
          <span className="fallback">{initials}</span>
        )}
        <span className="avatar-upload-overlay">{uploading ? "…" : "Modifier"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
      />
      {error && <p className="avatar-upload-error">{error}</p>}
    </div>
  );
}
