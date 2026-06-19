"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import "./dashboard.css";

/* ----------------------------------------------------------------
   Icons
---------------------------------------------------------------- */
const Drop = () => (
  <svg className="drop" viewBox="0 0 34 38" fill="none" aria-hidden="true">
    <path d="M17 2C10 12 4 18.5 4 25a13 13 0 0 0 26 0C30 18.5 24 12 17 2Z" fill="url(#dh)" />
    <path d="M9.5 26.4c2.4 0 2.4 2.4 4.8 2.4s2.4-2.4 4.8-2.4 2.4 2.4 4.8 2.4" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" />
    <path d="M10.3 31.5c2.1 0 2.1 2 4.2 2s2.1-2 4.2-2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />
    <defs>
      <linearGradient id="dh" x1="4" y1="2" x2="30" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#28D7E6" /><stop offset="1" stopColor="#1F73FF" />
      </linearGradient>
    </defs>
  </svg>
);

const NavIcon = ({ name }: { name: string }) => {
  switch (name) {
    case "home": return (
      <svg viewBox="0 0 24 24" fill="none">
        <path data-s="" d="M4 11.4 12 5l8 6.4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path data-s="" d="M6 10.6V18.4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7.8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path data-s="" d="M10 19.4v-4.2a2 2 0 0 1 4 0v4.2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    case "trophy": return (
      <svg viewBox="0 0 24 24" fill="none">
        <path data-s="" d="M7.5 4.5h9V8a4.5 4.5 0 0 1-9 0V4.5Z" strokeWidth="1.8" strokeLinejoin="round" />
        <path data-s="" d="M7.5 5.5H4.8v1a3 3 0 0 0 3 3" strokeWidth="1.8" strokeLinecap="round" />
        <path data-s="" d="M16.5 5.5h2.7v1a3 3 0 0 1-3 3" strokeWidth="1.8" strokeLinecap="round" />
        <path data-s="" d="M12 12.5v3M9 19.2h6M9.8 19.2l.5-3.7h3.4l.5 3.7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    case "chart": return (
      <svg viewBox="0 0 24 24" fill="none">
        <path data-s="" d="M5 20.2V11.5" strokeWidth="1.8" strokeLinecap="round" />
        <path data-s="" d="M12 20.2V4.4" strokeWidth="1.8" strokeLinecap="round" />
        <path data-s="" d="M19 20.2v-6" strokeWidth="1.8" strokeLinecap="round" />
        <path data-s="" d="M3.5 20.4h17" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
    case "ticket": return (
      <svg viewBox="0 0 24 24" fill="none">
        <path data-s="" d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" strokeWidth="1.8" strokeLinejoin="round" />
        <path data-s="" d="M13.5 6.8v8.2" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" />
      </svg>
    );
    case "user": return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle data-s="" cx="12" cy="8.5" r="3.6" strokeWidth="1.7" />
        <path data-s="" d="M5 19.5c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
    default: return null;
  }
};

const ColRank  = () => <svg viewBox="0 0 24 24" fill="none"><path d="M7.5 4.5h9V8a4.5 4.5 0 0 1-9 0V4.5Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7.5 5.5H4.8v1a3 3 0 0 0 3 3M16.5 5.5h2.7v1a3 3 0 0 1-3 3" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 12.5v3M9 19.2h6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /></svg>;
const ColTicket = () => <svg viewBox="0 0 24 24" fill="none"><path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" stroke="#11C2C2" strokeWidth="1.8" strokeLinejoin="round" /><path d="M13.5 6.8v8.2" stroke="#11C2C2" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" /></svg>;
const ColFlame  = () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 3c1 3 4 4.2 4 7.8a4 4 0 0 1-8 0c0-1.3.5-2.2 1-2.8.2 1 .9 1.6 1.6 1.6.9 0 1.4-.8 1.4-1.7C12 6.6 11 5 12 3Z" stroke="#FF7A45" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8 14.5a4 4 0 0 0 8 0" stroke="#FF7A45" strokeWidth="1.7" strokeLinecap="round" /></svg>;
const ColPin    = () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6.5-5 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 16 12 21 12 21Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10.6" r="2.2" stroke="#28D7E6" strokeWidth="1.7" /></svg>;
const ColMedal  = () => <svg viewBox="0 0 24 24" fill="none"><path d="M8.5 3.5 12 9l3.5-5.5" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="14.5" r="5.2" stroke="#28D7E6" strokeWidth="1.7" /><path d="M12 12.4v4.2M10 14.5h4" stroke="#28D7E6" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const ColUsers  = () => <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8.5" r="3" stroke="#28D7E6" strokeWidth="1.7" /><path d="M3.5 19c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /><path d="M16 5.4a3 3 0 0 1 0 6M17.5 14.6c2.4.4 4 2 4 4.4" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /></svg>;

const TicketStroke = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M13.5 6.8v8.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" />
  </svg>
);
const Bolt  = ({ c }: { c: string }) => <svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4 13.5h6.2L9 22l10-12.2h-6.3L14 2Z" fill={c} /></svg>;
const Check = ({ c }: { c: string }) => <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const XIcon = ({ c }: { c: string }) => <svg viewBox="0 0 24 24" fill="none"><path d="M6 6 18 18M18 6 6 18" stroke={c} strokeWidth="2.2" strokeLinecap="round" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ChevRight = () => <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const LogOutIcon = () => <svg viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" stroke="#FFD700" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/* ----------------------------------------------------------------
   Types
---------------------------------------------------------------- */
type View = "home" | "competitions" | "classement" | "profil";

type Odd = {
  id: string;
  nm: string;
  ctry: string;
  note: string;
  val: number;
  fav?: boolean;
};

type Competition = {
  id: string;
  name: string;
  location: string;
  flag: string;
  date: string;
  category: string;
  bettors: number;
  featured?: boolean;
  odds: Odd[];
};

type Player = {
  rank: number;
  name: string;
  ini: string;
  wins: number;
  balance: number;
  streak: number;
  isMe?: boolean;
};

type BetRecord = {
  id: string;
  event: string;
  athlete: string;
  odds: number;
  stake: number;
  result: "win" | "loss" | "pending";
  date: string;
};

/* ----------------------------------------------------------------
   Données statiques (beta — à brancher sur Supabase)
---------------------------------------------------------------- */
const TARGET = new Date("2026-07-16T10:00:00");
const pad = (n: number) => String(n).padStart(2, "0");

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const months = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

const COMPETITIONS: Competition[] = [
  {
    id: "chfr26",
    name: "Championnats de France · Descente",
    location: "La Plagne",
    flag: "FR",
    date: "2026-07-16",
    category: "Toutes catégories",
    bettors: 2480,
    featured: true,
    odds: [
      { id: "tostain",  nm: "D. Tostain",  ctry: "FR", note: "France", val: 1.65 },
      { id: "zerouga",  nm: "N. Zerouga",  ctry: "FR", note: "France", val: 2.87 },
      { id: "fontaine", nm: "L. Fontaine", ctry: "FR", note: "France · Favorite", val: 1.32, fav: true },
      { id: "lacoste",  nm: "E. Lacoste",  ctry: "FR", note: "France", val: 1.96 },
    ],
  },
  {
    id: "icf-sprint",
    name: "Coupe du Monde ICF · Sprint",
    location: "Poznań",
    flag: "PL",
    date: "2026-07-28",
    category: "K1 Hommes",
    bettors: 1240,
    odds: [
      { id: "kowalski", nm: "P. Kowalski", ctry: "PL", note: "Pologne · Favori", val: 1.45, fav: true },
      { id: "martin",   nm: "T. Martin",   ctry: "FR", note: "France", val: 2.20 },
      { id: "schmidt",  nm: "L. Schmidt",  ctry: "DE", note: "Allemagne", val: 2.75 },
      { id: "smith",    nm: "J. Smith",    ctry: "GB", note: "Grande-Bretagne", val: 3.10 },
    ],
  },
  {
    id: "euro-slalom",
    name: "Championnat d'Europe · Slalom",
    location: "Cracovie",
    flag: "PL",
    date: "2026-08-10",
    category: "C1 / K1",
    bettors: 890,
    odds: [
      { id: "muller", nm: "K. Müller", ctry: "DE", note: "Allemagne · Favori", val: 1.58, fav: true },
      { id: "dupont", nm: "A. Dupont", ctry: "FR", note: "France", val: 2.45 },
      { id: "novak",  nm: "J. Novák",  ctry: "CZ", note: "Tchéquie", val: 2.90 },
      { id: "ross",   nm: "E. Ross",   ctry: "AU", note: "Australie", val: 3.60 },
    ],
  },
  {
    id: "open-bretagne",
    name: "Open de Bretagne · Descente",
    location: "Brest",
    flag: "FR",
    date: "2026-08-22",
    category: "Descente K1",
    bettors: 340,
    odds: [
      { id: "leblanc", nm: "S. Leblanc", ctry: "FR", note: "France · Favori", val: 1.72, fav: true },
      { id: "mora",    nm: "C. Mora",    ctry: "ES", note: "Espagne", val: 2.30 },
      { id: "klein",   nm: "M. Klein",   ctry: "DE", note: "Allemagne", val: 2.85 },
      { id: "picard",  nm: "L. Picard",  ctry: "FR", note: "France", val: 3.20 },
    ],
  },
  {
    id: "masters-pau",
    name: "Masters ICF · Eau Vive",
    location: "Pau",
    flag: "FR",
    date: "2026-09-05",
    category: "Descente / Slalom",
    bettors: 560,
    odds: [
      { id: "richard", nm: "B. Richard",  ctry: "FR", note: "France · Favori", val: 1.80, fav: true },
      { id: "sanchez", nm: "O. Sánchez",  ctry: "ES", note: "Espagne", val: 2.10 },
      { id: "weber",   nm: "F. Weber",    ctry: "DE", note: "Allemagne", val: 2.55 },
      { id: "leroy",   nm: "C. Leroy",    ctry: "FR", note: "France", val: 3.40 },
    ],
  },
];

const LEADERBOARD: Player[] = [
  { rank: 1,   name: "KayakKing42",   ini: "KK", wins: 34, balance: 4820, streak: 7 },
  { rank: 2,   name: "PaddleQueen",   ini: "PQ", wins: 29, balance: 3940, streak: 3 },
  { rank: 3,   name: "EauVive59",     ini: "EV", wins: 26, balance: 3210, streak: 5 },
  { rank: 4,   name: "Descente_Pro",  ini: "DP", wins: 22, balance: 2870, streak: 2 },
  { rank: 5,   name: "Slalom_Boss",   ini: "SB", wins: 20, balance: 2540, streak: 1 },
  { rank: 6,   name: "RapidRider",    ini: "RR", wins: 18, balance: 2210, streak: 4 },
  { rank: 7,   name: "WhiteWaterF",   ini: "WF", wins: 15, balance: 1980, streak: 0 },
  { rank: 8,   name: "CayakFrance",   ini: "CF", wins: 13, balance: 1740, streak: 2 },
  { rank: 247, name: "Alex",          ini: "AX", wins: 8,  balance: 1000, streak: 3, isMe: true },
];

const BET_HISTORY: BetRecord[] = [
  { id: "h1", event: "Masters ICF · Descente",     athlete: "T. Büchner",  odds: 2.10, stake: 100, result: "win",     date: "2026-06-10" },
  { id: "h2", event: "Open Espagne · K1",           athlete: "R. García",   odds: 1.85, stake: 50,  result: "loss",    date: "2026-06-05" },
  { id: "h3", event: "Coupe de France · Sprint",    athlete: "N. Zerouga",  odds: 2.45, stake: 75,  result: "win",     date: "2026-05-28" },
  { id: "h4", event: "Euro Slalom · C1",            athlete: "K. Müller",   odds: 1.60, stake: 120, result: "win",     date: "2026-05-20" },
  { id: "h5", event: "Masters Bretagne · Descente", athlete: "D. Tostain",  odds: 1.65, stake: 80,  result: "loss",    date: "2026-05-12" },
  { id: "h6", event: "Champs Europe · Slalom",      athlete: "A. Dupont",   odds: 2.30, stake: 60,  result: "win",     date: "2026-05-02" },
];

const TOPNAV = [
  { ic: "home",   t: "Accueil",      v: "home"         as View | "drawer" },
  { ic: "trophy", t: "Compétitions", v: "competitions" as View | "drawer" },
  { ic: "chart",  t: "Classement",   v: "classement"   as View | "drawer" },
  { ic: "ticket", t: "Mes paris",    v: "drawer"       as View | "drawer" },
];

const BOTNAV = [
  { ic: "home",   t: "Accueil",    kind: "nav", v: "home"         as View },
  { ic: "trophy", t: "Compét.",    kind: "nav", v: "competitions" as View },
  { ic: "ticket", t: "Coupon",     kind: "bet"                           },
  { ic: "chart",  t: "Classement", kind: "nav", v: "classement"   as View },
  { ic: "user",   t: "Profil",     kind: "nav", v: "profil"       as View },
] as const;

/* ----------------------------------------------------------------
   Page
---------------------------------------------------------------- */
export default function DashboardPage() {
  const supabase = createClient();

  const [view,        setView]        = useState<View>("home");
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [balance,     setBalance]     = useState(1000);
  const [coupon,      setCoupon]      = useState<Record<string, Odd>>({});
  const [stake,       setStake]       = useState(50);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [cd,          setCd]          = useState({ d: "00", h: "00", m: "00", s: "00" });
  const [dbComps,     setDbComps]     = useState<Competition[] | null>(null);
  const [cdTarget,    setCdTarget]    = useState<Date>(new Date("2026-07-16T10:00:00"));
  const [name,        setName]        = useState("Alex");
  const [initials,    setInitials]    = useState("AX");
  const [userEmail,   setUserEmail]   = useState("");
  const [toast, setToast] = useState<{ icon: ReactNode; msg: ReactNode; err: boolean; show: boolean }>({
    icon: null, msg: null, err: false, show: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  /* profil */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      setUserEmail(email);
      if (email) {
        const base  = email.split("@")[0].replace(/[._-]+/g, " ").trim();
        const pretty = base.charAt(0).toUpperCase() + base.slice(1);
        setName(pretty);
        const parts = base.split(" ");
        setInitials(parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : base.slice(0, 2).toUpperCase());
      }
    });
  }, [supabase]);

  /* fetch competitions from Supabase */
  useEffect(() => {
    async function fetchComps() {
      const { data } = await supabase
        .from("competitions")
        .select("id, nom, date, discipline, lieu, participants(id, nom, pays, cote)")
        .eq("status", "published")
        .order("date", { ascending: true });
      if (!data || data.length === 0) return;
      const mapped: Competition[] = data.map((c: any, i: number) => {
        const parts: any[] = c.participants ?? [];
        parts.sort((a: any, b: any) => (a.cote ?? 99) - (b.cote ?? 99));
        const minCote = parts[0]?.cote ?? null;
        return {
          id: c.id,
          name: c.nom,
          location: c.lieu ?? "",
          flag: "FR",
          date: c.date ?? "",
          category: c.discipline ?? "",
          bettors: 0,
          featured: i === 0,
          odds: parts.map((p: any) => ({
            id: p.id,
            nm: p.nom,
            ctry: p.pays ?? "",
            note: p.pays ?? p.nom,
            val: p.cote != null ? parseFloat(p.cote) : 1.00,
            fav: minCote != null && p.cote === minCote,
          })),
        };
      });
      setDbComps(mapped);
      if (mapped[0]?.date) setCdTarget(new Date(mapped[0].date + "T10:00:00"));
    }
    fetchComps();
  }, [supabase]);

  /* countdown */
  useEffect(() => {
    const tick = () => {
      let diff = Math.max(0, cdTarget.getTime() - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5);  diff -= h * 36e5;
      const m = Math.floor(diff / 6e4);   diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      setCd({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cdTarget]);

  /* competitions — Supabase si disponible, sinon données statiques */
  const competitions = dbComps ?? COMPETITIONS;

  /* dérivés coupon */
  const selected   = Object.values(coupon);
  const count      = selected.length;
  const totalOdds  = selected.reduce((t, o) => t * o.val, 1);
  const gain       = Math.round((stake || 0) * totalOdds);

  /* helpers */
  function showToast(icon: ReactNode, msg: ReactNode, err = false) {
    setToast({ icon, msg, err, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }

  function toggle(o: Odd) {
    setCoupon((prev) => {
      const next = { ...prev };
      if (next[o.id]) delete next[o.id]; else next[o.id] = o;
      return next;
    });
  }

  function removeBet(id: string) {
    setCoupon((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  function addCredits() {
    setBalance(1000);
    showToast(<Check c="#28D7E6" />, <>Crédits fictifs · <span>rechargés à 1 000</span></>);
  }

  function validate() {
    const s = Math.max(0, stake || 0);
    if (s <= 0 || count === 0) return;
    if (s > balance) { showToast(<XIcon c="#FF7A45" />, "Solde insuffisant", true); return; }
    const g = Math.round(s * totalOdds);
    setBalance((b) => b - s);
    setCoupon({});
    setDrawerOpen(false);
    showToast(<Check c="#28D7E6" />, <>Pari validé · gain potentiel <span>{g.toLocaleString("fr-FR")} cr.</span></>);
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = "/";
  }

  function navigate(v: View | "drawer") {
    if (v === "drawer") { setDrawerOpen(true); return; }
    setView(v);
    if (v !== "competitions") setExpandedComp(null);
  }

  const topActive = { home: 0, competitions: 1, classement: 2, profil: -1 }[view] ?? -1;
  const botActive = { home: 0, competitions: 1, classement: 3, profil: 4 }[view] ?? -1;

  /* ---- ODDS GRID (partagé home + compétitions) ---- */
  const OddsGrid = ({ odds, eventName }: { odds: Odd[]; eventName: string }) => (
    <div className="odds-grid">
      {odds.map((o) => {
        const sel = !!coupon[o.id];
        return (
          <button key={o.id} className={`odd${o.fav ? " fav" : ""}${sel ? " sel" : ""}`} onClick={() => toggle(o)}>
            <div className="who">
              <div className="nm">{o.nm}</div>
              <div className="sub">
                <span className="ctry">{o.ctry}</span>
                {o.note}
              </div>
            </div>
            <div className="val">{o.val.toFixed(2)}</div>
            <div className="check"><Check c="#0A2A3D" /></div>
          </button>
        );
      })}
    </div>
  );

  /* ================================================================
     VUES
  ================================================================ */

  /* ---- HOME ---- */
  const HomeView = () => {
    const feat = competitions[0];
    return (
      <>
        <div className="greet">
          <div>
            <h1>Salut {name}, la <span className="c">ligne</span> t&apos;attend.</h1>
            <p>Une grosse manche se prépare. Compose ton coupon avant le départ.</p>
          </div>
          <div className="quick">
            <div className="chip-stat">
              <span className="ic"><ColRank /></span>
              <span className="tx"><span className="l">Classement</span><span className="v">247<em>e</em></span></span>
            </div>
            <div className="chip-stat">
              <span className="ic"><ColTicket /></span>
              <span className="tx"><span className="l">Paris en cours</span><span className="v">2</span></span>
            </div>
            <div className="chip-stat">
              <span className="ic"><ColFlame /></span>
              <span className="tx"><span className="l">Série</span><span className="v">3 victoires</span></span>
            </div>
          </div>
        </div>

        {feat && (
          <section className="feature">
            <div className="glow" />
            <svg className="water" viewBox="0 0 1130 140" preserveAspectRatio="none" fill="none">
              <path d="M0 74c142 0 142-32 284-32s142 32 284 32 142-32 284-32 142 32 284 32v66H0Z" fill="#0E3A52" opacity=".6" />
              <path d="M0 92c142 0 142-24 284-24s142 24 284 24 142-24 284-24 142 24 284 24v48H0Z" fill="#11C2C2" opacity=".1" />
            </svg>
            <div className="ft-top">
              <div className="ft-head">
                <span className="live">
                  <span className="bolt"><Bolt c="#FF7A45" /></span>
                  Prochaine grande compétition{feat.date ? ` · ${fmtDate(feat.date)}` : ""}
                </span>
                <h2>{feat.name}</h2>
                <div className="ft-meta">
                  {feat.location && <span className="m"><ColPin /><span>{feat.location}</span>{feat.flag && <span className="flag">{feat.flag}</span>}</span>}
                  {feat.category && <span className="m"><ColMedal /><span>{feat.category}</span></span>}
                  {feat.bettors > 0 && <span className="m"><ColUsers /><span>{feat.bettors.toLocaleString("fr-FR")} parieurs engagés</span></span>}
                </div>
              </div>
              <div className="cd" aria-label="Compte à rebours">
                {[{ n: cd.d, l: "Jours" }, { n: cd.h, l: "Heures" }, { n: cd.m, l: "Min" }, { n: cd.s, l: "Sec" }].map(({ n, l }) => (
                  <div className="unit" key={l}><div className="n">{n}</div><div className="l">{l}</div></div>
                ))}
              </div>
            </div>
            <div className="ft-line">
              <span className="lab"><span className="bar" /> Vainqueur — Classement général</span>
              <button className="all" onClick={() => navigate("competitions")}>Toutes les compétitions <Arrow /></button>
            </div>
            {feat.odds.length > 0
              ? <OddsGrid odds={feat.odds} eventName={feat.name} />
              : <p className="no-odds">Les cotes seront disponibles bientôt.</p>
            }
          </section>
        )}
      </>
    );
  };

  /* ---- COMPÉTITIONS ---- */
  const CompetitionsView = () => (
    <>
      <div className="view-header">
        <h1>Compétitions</h1>
        <p>{competitions.length} événement{competitions.length !== 1 ? "s" : ""} à venir · Sélectionne une cote pour parier</p>
      </div>
      <div className="comp-list">
        {competitions.map((c) => {
          const isOpen = expandedComp === c.id;
          return (
            <div key={c.id} className={`comp-card${c.featured ? " comp-featured" : ""}${isOpen ? " comp-open" : ""}`}>
              <div className="comp-card-top" onClick={() => setExpandedComp(isOpen ? null : c.id)}>
                <div className="comp-left">
                  {c.featured && <span className="comp-badge"><Bolt c="#FF7A45" /> Featured</span>}
                  <h2 className="comp-name">{c.name}</h2>
                  <div className="comp-meta">
                    <span><ColPin />{c.location}</span>
                    <span className="cflag">{c.flag}</span>
                    <span>{fmtDate(c.date)}</span>
                    <span>{c.category}</span>
                  </div>
                </div>
                <div className="comp-right">
                  <div className="comp-bettors">
                    <span className="bv">{c.bettors.toLocaleString("fr-FR")}</span>
                    <span className="bl">parieurs</span>
                  </div>
                  <div className={`comp-chevron${isOpen ? " open" : ""}`}><ChevRight /></div>
                </div>
              </div>
              {isOpen && (
                <div className="comp-odds-wrap">
                  <div className="comp-odds-label"><span className="bar" /> Vainqueur — {c.category}</div>
                  <OddsGrid odds={c.odds} eventName={c.name} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  /* ---- CLASSEMENT ---- */
  const rankColors: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

  const ClassementView = () => {
    const top3  = LEADERBOARD.filter((p) => p.rank <= 3);
    const rest  = LEADERBOARD.filter((p) => p.rank > 3 && !p.isMe);
    const me    = LEADERBOARD.find((p) => p.isMe);

    return (
      <>
        <div className="view-header">
          <h1>Classement</h1>
          <p>Semaine du 16 juin 2026 · {LEADERBOARD.length > 8 ? "2 480" : LEADERBOARD.length} joueurs</p>
        </div>

        {/* Podium top 3 */}
        <div className="podium">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((p) => (
            <div key={p!.rank} className={`pod pod-${p!.rank}`}>
              <div className="pod-star"><StarIcon filled /></div>
              <div className="pod-avatar" style={{ borderColor: rankColors[p!.rank] }}>
                <span>{p!.ini}</span>
              </div>
              <div className="pod-rank" style={{ color: rankColors[p!.rank] }}>#{p!.rank}</div>
              <div className="pod-name">{p!.name}</div>
              <div className="pod-bal">{p!.balance.toLocaleString("fr-FR")} cr.</div>
            </div>
          ))}
        </div>

        {/* Liste 4→8 */}
        <div className="lb-list">
          {rest.map((p) => (
            <div key={p.rank} className="lb-row">
              <span className="lb-rank">{p.rank}</span>
              <div className="lb-avatar"><span>{p.ini}</span></div>
              <span className="lb-name">{p.name}</span>
              <span className="lb-wins">{p.wins} victoires</span>
              <span className="lb-bal">{p.balance.toLocaleString("fr-FR")} cr.</span>
              {p.streak > 0 && <span className="lb-streak"><ColFlame />{p.streak}</span>}
            </div>
          ))}

          {me && (
            <>
              <div className="lb-gap">···</div>
              <div className="lb-row lb-me">
                <span className="lb-rank">{me.rank}</span>
                <div className="lb-avatar lb-avatar-me"><span>{me.ini}</span></div>
                <span className="lb-name">{me.name} <span className="me-tag">Moi</span></span>
                <span className="lb-wins">{me.wins} victoires</span>
                <span className="lb-bal">{balance.toLocaleString("fr-FR")} cr.</span>
                {me.streak > 0 && <span className="lb-streak"><ColFlame />{me.streak}</span>}
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  /* ---- PROFIL ---- */
  const totalWins   = BET_HISTORY.filter((b) => b.result === "win").length;
  const totalBets   = BET_HISTORY.length;
  const winRate     = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;

  const ProfilView = () => (
    <>
      <div className="profil-hero">
        <div className="glow" />
        <svg className="water" viewBox="0 0 1130 140" preserveAspectRatio="none" fill="none">
          <path d="M0 74c142 0 142-32 284-32s142 32 284 32 142-32 284-32 142 32 284 32v66H0Z" fill="#0E3A52" opacity=".6" />
          <path d="M0 92c142 0 142-24 284-24s142 24 284 24 142-24 284-24 142 24 284 24v48H0Z" fill="#11C2C2" opacity=".1" />
        </svg>
        <div className="profil-hero-inner">
          <div className="profil-avatar"><span>{initials}</span></div>
          <span className="profil-eyebrow">Mon profil · Saison 2026</span>
          <h1 className="profil-name">{name}</h1>
          <p className="profil-email">{userEmail}</p>
          <span className="profil-rank">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.5 7.1 18.2l.9-5.5-4-3.9 5.5-.8L12 3Z" stroke="#28D7E6" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            Rang 247 · Coupe du Monde
          </span>
        </div>
      </div>

      <div className="profil-section">
        <div className="profil-section-head">
          <span>Historique des paris</span>
          <span className="ps-count">{BET_HISTORY.length} paris</span>
        </div>
        <div className="history-list">
          {BET_HISTORY.map((b) => {
            const gain = Math.round(b.stake * b.odds);
            return (
              <div key={b.id} className={`history-item hi-${b.result}`}>
                <div className={`hi-dot hi-dot-${b.result}`} />
                <div className="hi-body">
                  <div className="hi-event">{b.event}</div>
                  <div className="hi-athlete">{b.athlete} · {b.odds.toFixed(2)}</div>
                </div>
                <div className="hi-right">
                  <div className={`hi-result hi-result-${b.result}`}>
                    {b.result === "win" ? `+${gain.toLocaleString("fr-FR")}` : b.result === "loss" ? `-${b.stake}` : "En cours"}
                  </div>
                  <div className="hi-date">{fmtDate(b.date)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {["loig.le.guennec@icloud.com", "leguennec.loig@gmail.com"].includes(userEmail ?? "") && (
        <a
          href="/admin"
          className="profil-signout"
          style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", marginBottom: "12px" }}
        >
          <svg viewBox="0 0 24 24" fill="none" style={{ width: "17px", height: "17px" }}>
            <path d="M12 3l8 4.5v5c0 4-3.3 7.7-8 9-4.7-1.3-8-5-8-9v-5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Panneau admin
        </a>
      )}

      <button className="profil-signout" onClick={signOut}>
        <LogOutIcon /> Se déconnecter
      </button>
    </>
  );

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div className="kb-app">

      {/* ============ HEADER ============ */}
      <header className="site">
        <div className="wrap nav-in">
          <a className="logo" href="/app" aria-label="Kayakbet" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
            <Drop />
            <span className="wm">Kayak<span className="b">bet</span></span>
          </a>

          <nav className="links">
            {TOPNAV.map((n, i) => (
              <a key={n.t} className={i === topActive ? "active" : ""} onClick={() => navigate(n.v)}>
                <NavIcon name={n.ic} /><span>{n.t}</span>
              </a>
            ))}
          </nav>

          <div className="head-right">
            <div className="balance">
              <span className="k">Solde</span>
              <span className="v">{balance.toLocaleString("fr-FR")}</span>
              <span className="u">cr.</span>
              <button className="plus" onClick={addCredits} aria-label="Recharger">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#28D7E6" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <button className="avatar" onClick={() => navigate("profil")} title="Profil">
              <span className="pic">{initials}</span>
              <span className="who">
                <span className="nm">{name}</span>
                <span className="rk">Rang 247</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ============ MAIN ============ */}
      <main>
        <div className="wrap">
          {view === "home"         && <HomeView />}
          {view === "competitions" && <CompetitionsView />}
          {view === "classement"   && <ClassementView />}
          {view === "profil"       && <ProfilView />}
        </div>
      </main>

      {/* ============ COUPON FAB ============ */}
      <button className="fab" onClick={() => setDrawerOpen(true)}>
        <TicketStroke c="#0A2A3D" /> Coupon <span className="cnt">{count}</span>
      </button>

      {/* ============ SCRIM + DRAWER ============ */}
      <div className={`scrim${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`drawer${drawerOpen ? " open" : ""}`}>
        <div className="drawer-head">
          <div className="ttl"><TicketStroke c="#fff" /> Mon coupon</div>
          <button className="close" onClick={() => setDrawerOpen(false)}><XIcon c="#9FBAC6" /></button>
        </div>

        <div className="drawer-body">
          {count === 0 ? (
            <div className="empty">
              <TicketStroke c="#5C7C8C" />
              <p>Ton coupon est vide. Clique sur une cote pour commencer.</p>
            </div>
          ) : (
            selected.map((o) => (
              <div className="bet" key={o.id}>
                <div className="ev">{o.note}</div>
                <div className="row">
                  <div className="nm">{o.nm}</div>
                  <div className="od">{o.val.toFixed(2)}</div>
                </div>
                <button className="rm" onClick={() => removeBet(o.id)}><XIcon c="currentColor" /></button>
              </div>
            ))
          )}
        </div>

        {count > 0 && (
          <div className="drawer-foot">
            <div className="stake">
              <label>Mise</label>
              <div className="field">
                <input type="number" min={1} value={stake} onChange={(e) => setStake(Math.max(0, +e.target.value || 0))} />
                <div className="chips">
                  <button className="chip" onClick={() => setStake((s) => (s || 0) + 10)}>+10</button>
                  <button className="chip" onClick={() => setStake((s) => (s || 0) + 50)}>+50</button>
                </div>
              </div>
            </div>
            <div className="summary"><span>Cote totale</span><span className="od">{totalOdds.toFixed(2)}</span></div>
            <div className="summary big">
              <span className="lab">Gain potentiel</span>
              <span className="gain">{gain.toLocaleString("fr-FR")}</span>
            </div>
            <button className="validate" onClick={validate}>Valider le pari</button>
          </div>
        )}
      </aside>

      {/* ============ TOAST ============ */}
      <div className={`toast${toast.show ? " show" : ""}`} style={{ borderColor: toast.err ? "#FF7A45" : "#28D7E6" }}>
        <span>{toast.icon}</span>
        <div className="tx">{toast.msg}</div>
      </div>

      {/* ============ BOTTOM NAV ============ */}
      <nav className="botnav">
        {BOTNAV.map((n, i) => {
          if (n.kind === "bet") {
            return (
              <button key={n.t} onClick={() => setDrawerOpen(true)}>
                <NavIcon name={n.ic} />
                <span className={`bdot${count > 0 ? " on" : ""}`}>{count}</span>
                <span className="bl">{n.t}</span>
              </button>
            );
          }
          return (
            <button key={n.t} className={i === botActive ? "active" : ""} onClick={() => navigate(n.v)}>
              <NavIcon name={n.ic} />
              <span className="bl">{n.t}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
