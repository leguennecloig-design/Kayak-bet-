"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastFn = (msg: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback((m: string) => {
    setMsg(m);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 1700);
  }, []);

  return (
    <ToastCtx.Provider value={flash}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 26,
          transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
          zIndex: 99,
          background: "#0C3146",
          border: "1px solid rgba(255,255,255,.16)",
          color: "#E9F3F7",
          font: "700 13px/1 var(--font-archivo), sans-serif",
          padding: "13px 20px",
          borderRadius: 12,
          boxShadow: "0 20px 44px -20px rgba(0,0,0,.7)",
          opacity: visible ? 1 : 0,
          transition: "opacity .25s, transform .25s",
          pointerEvents: "none",
        }}
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}
