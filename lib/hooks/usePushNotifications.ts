"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Le SW next-pwa peut mettre un instant à s'activer après un chargement à
// froid — sans timeout, `serviceWorker.ready` peut rester en attente
// indéfiniment si l'enregistrement échoue silencieusement, ce qui donnait
// l'impression que le bouton "Activer" ne faisait rien.
function serviceWorkerReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    ),
  ]);
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(isSupported);
    if (!isSupported) { setChecked(true); return; }
    serviceWorkerReady()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          permission === "denied"
            ? "Permission refusée — active les notifications dans les réglages du navigateur."
            : "Permission non accordée."
        );
        return false;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("Notifications pas encore configurées côté serveur.");
        return false;
      }

      const reg = await serviceWorkerReady();

      let sub: PushSubscription;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      } catch {
        // Une ancienne subscription liée à une autre clé VAPID bloque la
        // nouvelle (InvalidStateError) — on la retire puis on retente une fois.
        const existing = await reg.pushManager.getSubscription();
        if (!existing) throw new Error("subscribe a échoué");
        await existing.unsubscribe();
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `erreur serveur ${res.status}`);
      }

      setSubscribed(true);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg === "timeout"
          ? "Le service worker n'a pas répondu — recharge la page et réessaie."
          : `Impossible d'activer les notifications${msg ? ` (${msg})` : ""}.`
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError("");
    try {
      const reg = await serviceWorkerReady();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      return true;
    } catch {
      setError("Impossible de désactiver les notifications.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, subscribed, checked, busy, error, subscribe, unsubscribe };
}
