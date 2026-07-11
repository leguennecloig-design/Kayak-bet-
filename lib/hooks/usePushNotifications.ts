"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// next-pwa enregistre le service worker automatiquement au chargement de la
// page (register: true), mais rien ne garantit qu'il ait fini de le faire au
// moment où l'utilisateur clique sur "Activer" — se contenter d'attendre
// `serviceWorker.ready` pouvait rester bloqué indéfiniment sans retour si
// l'enregistrement automatique n'avait pas eu lieu ou avait échoué
// silencieusement (symptôme : le bouton ne fait rien). On enregistre donc
// nous-mêmes explicitement (idempotent si déjà fait par next-pwa) pour
// obtenir la vraie erreur du navigateur en cas d'échec, et on attend le
// passage à l'état "activated" avec un timeout clair plutôt qu'indéfini.
async function getReadyRegistration(timeoutMs = 15000): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register("/sw.js");
    } catch (e) {
      throw new Error(
        `échec de l'enregistrement du service worker (${e instanceof Error ? e.message : "erreur inconnue"})`
      );
    }
  }

  if (reg.active) return reg;

  const pendingWorker = reg.installing ?? reg.waiting;
  if (!pendingWorker) {
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) =>
        setTimeout(() => reject(new Error("le service worker n'a pas démarré à temps")), timeoutMs)
      ),
    ]);
  }

  const worker = pendingWorker;
  const readyReg = reg;
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener("statechange", onStateChange);
      reject(new Error("le service worker n'a pas démarré à temps"));
    }, timeoutMs);
    function onStateChange() {
      if (worker.state === "activated") {
        clearTimeout(timer);
        worker.removeEventListener("statechange", onStateChange);
        resolve(readyReg);
      } else if (worker.state === "redundant") {
        clearTimeout(timer);
        worker.removeEventListener("statechange", onStateChange);
        reject(new Error("le service worker a échoué à s'installer"));
      }
    }
    worker.addEventListener("statechange", onStateChange);
  });
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
    getReadyRegistration()
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        // L'abonnement navigateur (PushManager) est partagé par tous les
        // comptes utilisés sur cet appareil — un compte qui n'a jamais activé
        // les notifs hériterait sinon à tort de l'abonnement laissé par un
        // autre compte déjà testé sur le même téléphone. On confirme donc
        // côté serveur que CE compte précis est bien celui associé à cet
        // endpoint avant de considérer l'utilisateur comme abonné.
        if (!sub) { setSubscribed(false); return; }
        try {
          const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`);
          const data = res.ok ? await res.json() : null;
          setSubscribed(!!data?.subscribed);
        } catch {
          setSubscribed(false);
        }
      })
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

      const reg = await getReadyRegistration();

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
      setError(`Impossible d'activer les notifications${msg ? ` (${msg})` : ""}.`);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError("");
    try {
      const reg = await getReadyRegistration();
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
