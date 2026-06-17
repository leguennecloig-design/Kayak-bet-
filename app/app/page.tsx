"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import "./dashboard.css";

/* ----------------------------------------------------------------
   Icons (SVG inline — reproduits du handoff design)
-----------------------------------------------------------------*/
const Drop = () => (
  <svg className="drop" viewBox="0 0 34 38" fill="none" aria-hidden="true">
    <path d="M17 2C10 12 4 18.5 4 25a13 13 0 0 0 26 0C30 18.5 24 12 17 2Z" fill="url(#dh)" />
    <path d="M9.5 26.4c2.4 0 2.4 2.4 4.8 2.4s2.4-2.4 4.8-2.4 2.4 2.4 4.8 2.4" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" />
    <path d="M10.3 31.5c2.1 0 2.1 2 4.2 2s2.1-2 4.2-2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />
    <defs>
      <linearGradient id="dh" x1="4" y1="2" x2="30" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#28D7E6" />
        <stop offset="1" stopColor="#1F73FF" />
      </linearGradient>
    </defs>
  </svg>
);

const NavIcon = ({ name }: { name: string }) => {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path data-s="" d="M4 11.4 12 5l8 6.4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path data-s="" d="M6 10.6V18.4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7.8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path data-s="" d="M10 19.4v-4.2a2 2 0 0 1 4 0v4.2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path data-s="" d="M7.5 4.5h9V8a4.5 4.5 0 0 1-9 0V4.5Z" strokeWidth="1.8" strokeLinejoin="round" />
          <path data-s="" d="M7.5 5.5H4.8v1a3 3 0 0 0 3 3" strokeWidth="1.8" strokeLinecap="round" />
          <path data-s="" d="M16.5 5.5h2.7v1a3 3 0 0 1-3 3" strokeWidth="1.8" strokeLinecap="round" />
          <path data-s="" d="M12 12.5v3M9 19.2h6M9.8 19.2l.5-3.7h3.4l.5 3.7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path data-s="" d="M5 20.2V11.5" strokeWidth="1.8" strokeLinecap="round" />
          <path data-s="" d="M12 20.2V4.4" strokeWidth="1.8" strokeLinecap="round" />
          <path data-s="" d="M19 20.2v-6" strokeWidth="1.8" strokeLinecap="round" />
          <path data-s="" d="M3.5 20.4h17" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "ticket":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path data-s="" d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" strokeWidth="1.8" strokeLinejoin="round" />
          <path data-s="" d="M13.5 6.8v8.2" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <circle data-s="" cx="12" cy="8.5" r="3.6" strokeWidth="1.7" />
          <path data-s="" d="M5 19.5c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

const ColRank = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M7.5 4.5h9V8a4.5 4.5 0 0 1-9 0V4.5Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M7.5 5.5H4.8v1a3 3 0 0 0 3 3M16.5 5.5h2.7v1a3 3 0 0 1-3 3" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M12 12.5v3M9 19.2h6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const ColTicket = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" stroke="#11C2C2" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M13.5 6.8v8.2" stroke="#11C2C2" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" />
  </svg>
);
const ColFlame = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 3c1 3 4 4.2 4 7.8a4 4 0 0 1-8 0c0-1.3.5-2.2 1-2.8.2 1 .9 1.6 1.6 1.6.9 0 1.4-.8 1.4-1.7C12 6.6 11 5 12 3Z" stroke="#FF7A45" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M8 14.5a4 4 0 0 0 8 0" stroke="#FF7A45" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const ColPin = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 21s6.5-5 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 16 12 21 12 21Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="10.6" r="2.2" stroke="#28D7E6" strokeWidth="1.7" />
  </svg>
);
const ColMedal = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M8.5 3.5 12 9l3.5-5.5" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="14.5" r="5.2" stroke="#28D7E6" strokeWidth="1.7" />
    <path d="M12 12.4v4.2M10 14.5h4" stroke="#28D7E6" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const ColUsers = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="8.5" r="3" stroke="#28D7E6" strokeWidth="1.7" />
    <path d="M3.5 19c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M16 5.4a3 3 0 0 1 0 6M17.5 14.6c2.4.4 4 2 4 4.4" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const TicketStroke = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M13.5 6.8v8.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" />
  </svg>
);
const Bolt = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M13 2 4 13.5h6.2L9 22l10-12.2h-6.3L14 2Z" fill={c} />
  </svg>
);
const Check = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5 10 17.5 19 7" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M6 6 18 18M18 6 6 18" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ----------------------------------------------------------------
   Données (placeholders — à brancher sur l'API)
-----------------------------------------------------------------*/
type Odd = {
  id: string;
  nm: string;
  ctry: string;
  note: string;
  val: number;
  fav?: boolean;
};

const EVENT = "Championnats de France · La Plagne";
const ODDS: Odd[] = [
  { id: "tostain", nm: "D. Tostain", ctry: "FR", note: "France · Favori", val: 1.65 },
  { id: "zerouga", nm: "N. Zerouga", ctry: "FR", note: "France", val: 2.87 },
  { id: "fontaine", nm: "L. Fontaine", ctry: "FR", note: "France · Favorite", val: 1.32, fav: true },
  { id: "lacoste", nm: "E. Lacoste", ctry: "FR", note: "France", val: 1.96 },
];

const TARGET = new Date("2026-07-16T10:00:00");
const pad = (n: number) => String(n).padStart(2, "0");

const TOPNAV = [
  { ic: "home", t: "Accueil" },
  { ic: "trophy", t: "Compétitions" },
  { ic: "chart", t: "Classement" },
  { ic: "ticket", t: "Mes paris" },
];
const BOTNAV = [
  { ic: "home", t: "Accueil", kind: "nav" },
  { ic: "trophy", t: "Compét.", kind: "nav" },
  { ic: "ticket", t: "Coupon", kind: "bet" },
  { ic: "chart", t: "Classement", kind: "nav" },
  { ic: "user", t: "Profil", kind: "nav" },
];

/* ----------------------------------------------------------------
   Page
-----------------------------------------------------------------*/
export default function DashboardPage() {
  const supabase = createClient();

  const [balance, setBalance] = useState(1000);
  const [coupon, setCoupon] = useState<Record<string, Odd>>({});
  const [stake, setStake] = useState(50);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTop, setActiveTop] = useState(0);
  const [activeBot, setActiveBot] = useState(0);
  const [cd, setCd] = useState({ d: "00", h: "00", m: "00", s: "00" });
  const [name, setName] = useState("Alex");
  const [initials, setInitials] = useState("AX");

  const [toast, setToast] = useState<{ icon: ReactNode; msg: ReactNode; err: boolean; show: boolean }>({
    icon: null,
    msg: null,
    err: false,
    show: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  /* ---- profil utilisateur ---- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email) {
        const base = email.split("@")[0].replace(/[._-]+/g, " ").trim();
        const pretty = base.charAt(0).toUpperCase() + base.slice(1);
        setName(pretty);
        const parts = base.split(" ");
        const ini =
          parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : base.slice(0, 2).toUpperCase();
        setInitials(ini);
      }
    });
  }, [supabase]);

  /* ---- countdown ---- */
  useEffect(() => {
    const tick = () => {
      let diff = Math.max(0, TARGET.getTime() - Date.now());
      const d = Math.floor(diff / 864e5);
      diff -= d * 864e5;
      const h = Math.floor(diff / 36e5);
      diff -= h * 36e5;
      const m = Math.floor(diff / 6e4);
      diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      setCd({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- dérivés ---- */
  const selected = Object.values(coupon);
  const count = selected.length;
  const totalOdds = selected.reduce((t, o) => t * o.val, 1);
  const gain = Math.round((stake || 0) * totalOdds);

  /* ---- actions ---- */
  function showToast(icon: ReactNode, msg: ReactNode, err = false) {
    setToast({ icon, msg, err, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      2800
    );
  }

  function toggle(o: Odd) {
    setCoupon((prev) => {
      const next = { ...prev };
      if (next[o.id]) delete next[o.id];
      else next[o.id] = o;
      return next;
    });
  }

  function removeBet(id: string) {
    setCoupon((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addCredits() {
    setBalance(1000);
    showToast(<Check c="#28D7E6" />, <>Crédits fictifs · <span>rechargés à 1 000</span></>);
  }

  function validate() {
    const s = Math.max(0, stake || 0);
    if (s <= 0 || count === 0) return;
    if (s > balance) {
      showToast(<XIcon c="#FF7A45" />, "Solde insuffisant", true);
      return;
    }
    const g = Math.round(s * totalOdds);
    setBalance((b) => b - s);
    setCoupon({});
    setDrawerOpen(false);
    showToast(
      <Check c="#28D7E6" />,
      <>Pari validé · gain potentiel <span>{g.toLocaleString("fr-FR")} cr.</span></>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = "/";
  }

  return (
    <div className="kb-app">
      {/* ============ HEADER ============ */}
      <header className="site">
        <div className="wrap nav-in">
          <a className="logo" href="/app" aria-label="Kayakbet">
            <Drop />
            <span className="wm">
              Kayak<span className="b">bet</span>
            </span>
          </a>

          <nav className="links">
            {TOPNAV.map((n, i) => (
              <a
                key={n.t}
                className={i === activeTop ? "active" : ""}
                onClick={() => setActiveTop(i)}
              >
                <NavIcon name={n.ic} />
                <span>{n.t}</span>
              </a>
            ))}
          </nav>

          <div className="head-right">
            <div className="balance">
              <span className="k">Solde</span>
              <span className="v">{balance.toLocaleString("fr-FR")}</span>
              <span className="u">cr.</span>
              <button className="plus" onClick={addCredits} aria-label="Ajouter des crédits">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="#28D7E6" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button className="avatar" onClick={signOut} title="Se déconnecter">
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
          {/* greeting + quick stats */}
          <div className="greet">
            <div>
              <h1>
                Salut {name}, la <span className="c">ligne</span> t&apos;attend.
              </h1>
              <p>Une grosse manche se prépare. Compose ton coupon avant le départ.</p>
            </div>
            <div className="quick">
              <div className="chip-stat">
                <span className="ic">
                  <ColRank />
                </span>
                <span className="tx">
                  <span className="l">Classement</span>
                  <span className="v">
                    247<em>e</em>
                  </span>
                </span>
              </div>
              <div className="chip-stat">
                <span className="ic">
                  <ColTicket />
                </span>
                <span className="tx">
                  <span className="l">Paris en cours</span>
                  <span className="v">2</span>
                </span>
              </div>
              <div className="chip-stat">
                <span className="ic">
                  <ColFlame />
                </span>
                <span className="tx">
                  <span className="l">Série</span>
                  <span className="v">3 victoires</span>
                </span>
              </div>
            </div>
          </div>

          {/* FEATURED COMPETITION */}
          <section className="feature">
            <div className="glow" />
            <svg className="water" viewBox="0 0 1130 140" preserveAspectRatio="none" fill="none">
              <path d="M0 74c142 0 142-32 284-32s142 32 284 32 142-32 284-32 142 32 284 32v66H0Z" fill="#0E3A52" opacity=".6" />
              <path d="M0 92c142 0 142-24 284-24s142 24 284 24 142-24 284-24 142 24 284 24v48H0Z" fill="#11C2C2" opacity=".1" />
            </svg>

            <div className="ft-top">
              <div className="ft-head">
                <span className="live">
                  <span className="bolt">
                    <Bolt c="#FF7A45" />
                  </span>{" "}
                  Prochaine grande compétition · 16 juillet 2026
                </span>
                <h2>Championnats de France de Descente</h2>
                <div className="ft-meta">
                  <span className="m">
                    <ColPin />
                    <span>La Plagne</span>
                    <span className="flag">FR</span>
                  </span>
                  <span className="m">
                    <ColMedal />
                    <span>Toutes catégories</span>
                  </span>
                  <span className="m">
                    <ColUsers />
                    <span>2 480 parieurs engagés</span>
                  </span>
                </div>
              </div>

              <div className="cd" aria-label="Compte à rebours">
                <div className="unit">
                  <div className="n">{cd.d}</div>
                  <div className="l">Jours</div>
                </div>
                <div className="unit">
                  <div className="n">{cd.h}</div>
                  <div className="l">Heures</div>
                </div>
                <div className="unit">
                  <div className="n">{cd.m}</div>
                  <div className="l">Min</div>
                </div>
                <div className="unit">
                  <div className="n">{cd.s}</div>
                  <div className="l">Sec</div>
                </div>
              </div>
            </div>

            <div className="ft-line">
              <span className="lab">
                <span className="bar" /> Vainqueur — Classement général
              </span>
              <button className="all">
                Tous les paris <Arrow />
              </button>
            </div>

            <div className="odds-grid">
              {ODDS.map((o) => {
                const sel = !!coupon[o.id];
                return (
                  <button
                    key={o.id}
                    className={`odd${o.fav ? " fav" : ""}${sel ? " sel" : ""}`}
                    onClick={() => toggle(o)}
                  >
                    <div className="who">
                      <div className="nm">{o.nm}</div>
                      <div className="sub">
                        <span className="ctry">{o.ctry}</span>
                        {o.note}
                      </div>
                    </div>
                    <div className="val">{o.val.toFixed(2)}</div>
                    <div className="check">
                      <Check c="#0A2A3D" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* COUPON FAB */}
      <button className="fab" onClick={() => setDrawerOpen(true)}>
        <TicketStroke c="#0A2A3D" /> Coupon <span className="cnt">{count}</span>
      </button>

      {/* SCRIM + DRAWER */}
      <div
        className={`scrim${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`drawer${drawerOpen ? " open" : ""}`}>
        <div className="drawer-head">
          <div className="ttl">
            <TicketStroke c="#fff" /> Mon coupon
          </div>
          <button className="close" onClick={() => setDrawerOpen(false)}>
            <XIcon c="#9FBAC6" />
          </button>
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
                <div className="ev">{EVENT}</div>
                <div className="row">
                  <div className="nm">{o.nm}</div>
                  <div className="od">{o.val.toFixed(2)}</div>
                </div>
                <button className="rm" onClick={() => removeBet(o.id)}>
                  <XIcon c="currentColor" />
                </button>
              </div>
            ))
          )}
        </div>

        {count > 0 && (
          <div className="drawer-foot">
            <div className="stake">
              <label>Mise</label>
              <div className="field">
                <input
                  type="number"
                  min={1}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0, +e.target.value || 0))}
                />
                <div className="chips">
                  <button className="chip" onClick={() => setStake((s) => (s || 0) + 10)}>
                    +10
                  </button>
                  <button className="chip" onClick={() => setStake((s) => (s || 0) + 50)}>
                    +50
                  </button>
                </div>
              </div>
            </div>
            <div className="summary">
              <span>Cote totale</span>
              <span className="od">{totalOdds.toFixed(2)}</span>
            </div>
            <div className="summary big">
              <span className="lab">Gain potentiel</span>
              <span className="gain">{gain.toLocaleString("fr-FR")}</span>
            </div>
            <button className="validate" onClick={validate}>
              Valider le pari
            </button>
          </div>
        )}
      </aside>

      {/* TOAST */}
      <div className={`toast${toast.show ? " show" : ""}`} style={{ borderColor: toast.err ? "#FF7A45" : "#28D7E6" }}>
        <span>{toast.icon}</span>
        <div className="tx">{toast.msg}</div>
      </div>

      {/* MOBILE BOTTOM NAV */}
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
            <button
              key={n.t}
              className={i === activeBot ? "active" : ""}
              onClick={() => setActiveBot(i)}
            >
              <NavIcon name={n.ic} />
              <span className="bl">{n.t}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
