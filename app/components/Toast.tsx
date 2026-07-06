"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import "./Toast.css";

export type ToastData = {
  course: string;
  category?: string;
  href: string;
  message?: string;
};

type ToastInput = ToastData | string;

type Status = "queued" | "visible" | "leaving";
type ToastItem = ToastData & { id: number; status: Status };

const MAX_VISIBLE = 3;
const LIFETIME_MS = 12000;
const OUT_MS = 340;

type NotifyFn = (data: ToastInput) => number;
const ToastCtx = createContext<NotifyFn>(() => 0);

export function useToast(): NotifyFn {
  return useContext(ToastCtx);
}

// Fait passer en "visible" les toasts "queued" les plus anciens tant qu'il
// reste de la place (max MAX_VISIBLE affichés simultanément).
function promote(list: ToastItem[]): ToastItem[] {
  const visibleCount = list.filter((t) => t.status === "visible").length;
  let slots = MAX_VISIBLE - visibleCount;
  if (slots <= 0) return list;
  return list.map((t) => {
    if (slots > 0 && t.status === "queued") {
      slots--;
      return { ...t, status: "visible" as const };
    }
    return t;
  });
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seqRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id && t.status === "visible" ? { ...t, status: "leaving" as const } : t))
    );
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => setToasts((prev) => promote(prev.filter((t) => t.id !== id))),
      reduceMotion ? 200 : OUT_MS
    );
  }, []);

  const notify = useCallback<NotifyFn>((data) => {
    const normalized: ToastData = typeof data === "string" ? { course: data, href: "#" } : data;
    const id = ++seqRef.current;
    setToasts((prev) => promote([...prev, { id, ...normalized, status: "queued" as const }]));
    return id;
  }, []);

  const shown = toasts.filter((t) => t.status !== "queued");
  const queueLen = toasts.filter((t) => t.status === "queued").length;

  return (
    <ToastCtx.Provider value={notify}>
      {children}
      <div className="kb-toast-host" aria-live="polite" aria-atomic="false">
        {shown.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
        <div className={`kb-queue${queueLen > 0 ? " show" : ""}`}>
          {queueLen > 0 ? `+${queueLen} en attente` : ""}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const progRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef(LIFETIME_MS);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const reduceMotionRef = useRef(false);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const pausedRef = useRef(false);

  function startTimer() {
    startRef.current = Date.now();
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onDismiss(item.id), remainingRef.current);
    if (!reduceMotionRef.current && progRef.current) {
      const p = progRef.current;
      const done = 1 - remainingRef.current / LIFETIME_MS;
      p.style.transition = "none";
      p.style.transform = `scaleX(${1 - done})`;
      requestAnimationFrame(() => {
        p.style.transition = `transform ${remainingRef.current}ms linear`;
        p.style.transform = "scaleX(0)";
      });
    }
  }

  function pauseTimer() {
    clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startRef.current;
    if (remainingRef.current < 0) remainingRef.current = 0;
    if (!reduceMotionRef.current && progRef.current) {
      const cs = getComputedStyle(progRef.current);
      progRef.current.style.transition = "none";
      progRef.current.style.transform = cs.transform;
    }
  }

  // Pause si survol OU focus clavier ; reprise seulement quand aucun des deux
  // n'est plus actif (évite un double-décompte si les deux se chevauchent).
  function evaluatePause() {
    const shouldPause = hoverRef.current || focusRef.current;
    if (shouldPause && !pausedRef.current) {
      pausedRef.current = true;
      pauseTimer();
    } else if (!shouldPause && pausedRef.current) {
      pausedRef.current = false;
      startTimer();
    }
  }

  useLayoutEffect(() => {
    reduceMotionRef.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    startTimer();
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNavigate() {
    if (item.href && item.href !== "#") router.push(item.href);
    onDismiss(item.id);
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    onDismiss(item.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNavigate();
    }
    if (e.key === "Escape") onDismiss(item.id);
  }

  const cls = `kb-toast${item.status === "leaving" ? " out" : entered ? " in" : ""}`;

  return (
    <div
      className={cls}
      role="status"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => { hoverRef.current = true; evaluatePause(); }}
      onMouseLeave={() => { hoverRef.current = false; evaluatePause(); }}
      onFocus={() => { focusRef.current = true; evaluatePause(); }}
      onBlur={() => { focusRef.current = false; evaluatePause(); }}
    >
      <div className="kb-ico">
        <CheckIcon />
        <span className="ping" />
      </div>
      <div className="kb-body">
        <div className="kb-kicker">{item.message || "Résultats mis à jour"}</div>
        <div className="kb-course">{item.course}</div>
        <div className="kb-sub">
          {item.category && <span className="cat">{item.category} · </span>}
          Nouveaux temps disponibles
        </div>
      </div>
      <div className="kb-arrow"><ArrowIcon /></div>
      <button className="kb-close" aria-label="Fermer" onClick={handleClose}>
        <CloseIcon />
      </button>
      <div className="kb-prog" ref={progRef} />
    </div>
  );
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="m4 13 5 5L20 6" />
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
