"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase";
import dynamic from "next/dynamic";
import type { BetType } from "@/lib/algo/types";
import CategoryBetModal from "@/app/components/CategoryBetModal";
import EditProfileModal from "@/app/components/EditProfileModal";
import LinkAthleteModal from "@/app/components/LinkAthleteModal";
import "./dashboard.css";

const BET_LABELS: Record<BetType, string> = {
  TOP_1: "Vainqueur",
  TOP_3: "Top 3",
  TOP_5: "Top 5",
  TOP_10: "Top 10",
  TOP_20: "Top 20",
  EXACT_PLACE: "Place exacte",
  EXACT_TIME: "Temps exact",
};

const LiveSection = dynamic(() => import("./LiveSection"), { ssr: false });

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

const ColRank   = () => <svg viewBox="0 0 24 24" fill="none"><path d="M7.5 4.5h9V8a4.5 4.5 0 0 1-9 0V4.5Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7.5 5.5H4.8v1a3 3 0 0 0 3 3M16.5 5.5h2.7v1a3 3 0 0 1-3 3" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 12.5v3M9 19.2h6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /></svg>;
const ColTicket = () => <svg viewBox="0 0 24 24" fill="none"><path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" stroke="#11C2C2" strokeWidth="1.8" strokeLinejoin="round" /><path d="M13.5 6.8v8.2" stroke="#11C2C2" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" /></svg>;
const ColFlame  = () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 3c1 3 4 4.2 4 7.8a4 4 0 0 1-8 0c0-1.3.5-2.2 1-2.8.2 1 .9 1.6 1.6 1.6.9 0 1.4-.8 1.4-1.7C12 6.6 11 5 12 3Z" stroke="#FF7A45" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8 14.5a4 4 0 0 0 8 0" stroke="#FF7A45" strokeWidth="1.7" strokeLinecap="round" /></svg>;
const ColPin    = () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6.5-5 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 16 12 21 12 21Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10.6" r="2.2" stroke="#28D7E6" strokeWidth="1.7" /></svg>;
const ColMedal  = () => <svg viewBox="0 0 24 24" fill="none"><path d="M8.5 3.5 12 9l3.5-5.5" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="14.5" r="5.2" stroke="#28D7E6" strokeWidth="1.7" /><path d="M12 12.4v4.2M10 14.5h4" stroke="#28D7E6" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const ColUsers  = () => <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8.5" r="3" stroke="#28D7E6" strokeWidth="1.7" /><path d="M3.5 19c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /><path d="M16 5.4a3 3 0 0 1 0 6M17.5 14.6c2.4.4 4 2 4 4.4" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" /></svg>;

const InstaIcon = () => <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>;

function InstaLink({ handle, className = "insta-link" }: { handle?: string | null; className?: string }) {
  if (!handle) return null;
  return (
    <a
      href={`https://instagram.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Instagram @${handle}`}
    >
      <InstaIcon />
    </a>
  );
}

const TicketStroke = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 8.2A1.8 1.8 0 0 1 5.8 6.4h12.4A1.8 1.8 0 0 1 20 8.2a1.8 1.8 0 0 0 0 3.6 1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 11.8a1.8 1.8 0 0 0 0-3.6Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M13.5 6.8v8.2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.4 2.4" />
  </svg>
);
const Bolt      = ({ c }: { c: string }) => <svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4 13.5h6.2L9 22l10-12.2h-6.3L14 2Z" fill={c} /></svg>;
const Check     = ({ c }: { c: string }) => <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const XIcon     = ({ c }: { c: string }) => <svg viewBox="0 0 24 24" fill="none"><path d="M6 6 18 18M18 6 6 18" stroke={c} strokeWidth="2.2" strokeLinecap="round" /></svg>;
const Arrow     = () => <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ChevRight = () => <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const LogOutIcon = () => <svg viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const StarIcon  = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" stroke="#FFD700" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/* ----------------------------------------------------------------
   Types
---------------------------------------------------------------- */
type View = "home" | "competitions" | "classement" | "profil" | "joueur" | "ligue";

type Odd = {
  id: string;            // clé composite `${participantId}:${betType}`
  participantId: string;
  betType: BetType;
  betLabel: string;
  nm: string;
  ctry: string;
  note: string;
  val: number;
  fav?: boolean;
  competitionId?: string;
  categorie?:     string;
  codeBateau?:    string | null;
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
  typeCompetition?: string | null;
};

type Player = {
  id: string;
  rank: number;
  name: string;
  ini: string;
  wins: number;
  balance: number;
  avatarUrl?: string | null;
  instagram?: string | null;
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
  gainPotentiel?: number;
  gainReel?: number | null;
};

/* ----------------------------------------------------------------
   Données statiques (beta)
---------------------------------------------------------------- */
const pad = (n: number) => String(n).padStart(2, "0");

function cleanPays(s: string) {
  return s.replace(/^\d{4}(?:\/\d{4})*\s*-\s*/, "").trim();
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const months = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

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

const rankColors: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

/* ----------------------------------------------------------------
   Sub-view prop types
---------------------------------------------------------------- */
type HomeViewProps = {
  competitions: Competition[];
  name: string;
  cd: { d: string; h: string; m: string; s: string };
  navigate: (v: View | "drawer") => void;
  myRank: number | null;
  pendingCount: number;
  streak: number;
  effectiveBets: BetRecord[];
  effectiveLb: Player[];
  openBetModal: (compId: string, compNom: string) => void;
};

type CompetitionsViewProps = {
  competitions: Competition[];
  openBetModal: (compId: string, compNom: string) => void;
};

type ClassementViewProps = {
  effectiveLb: Player[];
  onOpenProfile: (id: string) => void;
};

type PlayerProfileViewProps = {
  playerId: string;
  onBack: () => void;
};

type LeagueViewProps = {
  leagueId: string;
  onBack: () => void;
};

type LeagueSummary = {
  id: string;
  name: string;
  inviteCode: string;
  currentSeason: number;
  isCreator: boolean;
  memberCount: number;
  myRank: number;
  myGain: number;
};

type LeagueMemberRow = {
  userId: string;
  username: string;
  initials: string;
  avatarUrl: string | null;
  gain: number;
  rank: number;
};

type LeagueDetail = {
  id: string;
  name: string;
  inviteCode: string;
  currentSeason: number;
  isCreator: boolean;
  members: LeagueMemberRow[];
};

type FriendshipStatus = "none" | "pending_outgoing" | "pending_incoming" | "friends";

type PublicProfile = {
  id: string;
  username: string;
  initials: string;
  avatarUrl: string | null;
  bio: string;
  instagram: string | null;
  balance: number;
  rank: number;
  wins: number;
  totalBets: number;
  winRate: number;
  bets: BetRecord[];
  friendshipStatus?: FriendshipStatus;
  friendshipId?: string | null;
};

type FriendEntry = {
  friendshipId: string;
  userId: string;
  username: string;
  initials: string;
  avatarUrl: string | null;
};

type ProfilViewProps = {
  name: string;
  initials: string;
  userEmail: string;
  myRank: number | null;
  balance: number;
  effectiveBets: BetRecord[];
  signOut: () => Promise<void>;
  avatarUrl: string | null;
  bio: string;
  instagram: string | null;
  onEditProfile: () => void;
  linkedAthlete: LinkedAthlete | null;
  onLinkAthlete: () => void;
  onOpenProfile: (id: string) => void;
  onOpenLeague: (id: string) => void;
};

type LinkedAthlete = { id: string; nom: string; prenom: string | null; club: string | null; categorie: string | null };

/* ----------------------------------------------------------------
   Sub-views — defined OUTSIDE DashboardPage so React never
   unmounts/remounts them on parent re-renders (e.g. countdown tick)
---------------------------------------------------------------- */

function HomeView({
  competitions, name, cd, navigate,
  myRank, pendingCount, streak,
  effectiveBets, effectiveLb, openBetModal,
}: HomeViewProps) {
  const feat    = competitions[0];
  const pending = effectiveBets.filter(b => b.result === "pending");
  const top3    = effectiveLb.filter(p => p.rank <= 3);
  const me      = effectiveLb.find(p => p.isMe);

  return (
    <>
      <div className="greet">
        <div>
          <h1>Salut {name}, la <span className="c">ligne</span> t&apos;attend.</h1>
          <p>Une grosse manche se prépare. Compose ton coupon avant le départ.</p>
        </div>
        <div className="quick">
          <div className="chip-stat chip-rank">
            <span className="ic"><ColRank /></span>
            <span className="tx"><span className="l">Classement</span><span className="v">{myRank !== null ? <>{myRank}<em>e</em></> : "—"}</span></span>
          </div>
          <div className="chip-stat chip-bets">
            <span className="ic"><ColTicket /></span>
            <span className="tx"><span className="l">Paris en cours</span><span className="v">{pendingCount}</span></span>
          </div>
          <div className="chip-stat chip-streak">
            <span className="ic"><ColFlame /></span>
            <span className="tx"><span className="l">Série</span><span className="v">{streak > 0 ? `${streak} victoire${streak > 1 ? "s" : ""}` : "—"}</span></span>
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
                {feat.typeCompetition && <span className="m">{feat.typeCompetition === "sprint" ? "Sprint" : "Classique"}</span>}
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
            <span className="lab"><span className="bar" /> Startlist & cotes</span>
            <button className="all" onClick={() => navigate("competitions")}>Toutes les compétitions <Arrow /></button>
          </div>
          {feat.odds.length > 0 ? (
            <button className="cat-open-modal" onClick={() => openBetModal(feat.id, feat.name)}>
              Voir la startlist & parier <Arrow />
            </button>
          ) : <p className="no-odds">Les cotes seront disponibles bientôt.</p>}
        </section>
      )}

      <LiveSection />

      {/* Sectionhead only when multiple competitions */}
      {competitions.length > 1 && (
        <div className="sectionhead">
          <div className="l">
            <span className="bar" />
            <h3>Prochaines compétitions</h3>
          </div>
          <button className="more" onClick={() => navigate("competitions")}>
            Tout voir →
          </button>
        </div>
      )}

      {/* Lower grid — side cards always visible; mini-list conditional */}
      <div className="lower" style={competitions.length <= 1 ? { gridTemplateColumns: "1fr" } : undefined}>
        {competitions.length > 1 && (
          <div className="mini-list">
            {competitions.slice(1).map(c => {
              const dt  = c.date ? new Date(c.date) : null;
              const day = dt ? dt.getDate() : "—";
              const mon = dt ? dt.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") : "";
              return (
                <div key={c.id} className="mini" onClick={() => openBetModal(c.id, c.name)}>
                  <div className="when">
                    <div className="day">{day}</div>
                    <div className="mon">{mon}</div>
                  </div>
                  <div className="info">
                    <div className="cat">{c.category}</div>
                    <div className="t">{c.name}</div>
                    {c.location && <div className="loc">{c.location}</div>}
                  </div>
                  <div className="go">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="side-col">
          {/* Paris en cours */}
          <div className="side-card">
            <div className="hd">
              <div className="t"><ColTicket />Paris en cours</div>
              {pending.length > 0 && <span className="badge">{pending.length} actif{pending.length > 1 ? "s" : ""}</span>}
            </div>
            {pending.length === 0 ? (
              <p style={{ font: "600 13px/1.4 var(--font-archivo)", color: "var(--sub)", margin: 0 }}>
                Aucun pari en cours. Sélectionne des cotes !
              </p>
            ) : (
              <>
                {pending.slice(0, 2).map(b => (
                  <div key={b.id} className="openbet">
                    <div className="ev">{b.event}</div>
                    <div className="row">
                      <div className="nm">{b.athlete}</div>
                      <div className="od">{b.odds.toFixed(2)}</div>
                    </div>
                    <div className="ft">
                      <span>Mise · {b.stake} cr.</span>
                      <span className="gain">+{(b.gainPotentiel ?? Math.round(b.stake * b.odds)).toLocaleString("fr-FR")} pot.</span>
                    </div>
                  </div>
                ))}
                {pending.length > 2 && (
                  <button
                    onClick={() => navigate("profil")}
                    style={{ font: "700 12px/1 var(--font-grotesk), monospace", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", marginTop: 10, display: "block", letterSpacing: ".04em" }}
                  >
                    +{pending.length - 2} autres →
                  </button>
                )}
              </>
            )}
          </div>

          {/* Classement rapide */}
          <div className="side-card">
            <div className="hd">
              <div className="t"><ColRank />Classement</div>
              <button className="badge" style={{ background: "none", cursor: "pointer", border: "1px solid rgba(40,215,230,.32)" }} onClick={() => navigate("classement")}>
                Voir tout
              </button>
            </div>
            {top3.map(p => (
              <div key={p.name} className="home-lb-row">
                <span className="pos">{p.rank}</span>
                <div className="av">{p.ini}</div>
                <div className="nm">
                  {p.name}
                  <small>{p.balance.toLocaleString("fr-FR")} cr.</small>
                </div>
                <span className="pts">{p.wins} vic.</span>
              </div>
            ))}
            {me && me.rank > 3 && (
              <div className="home-lb-row you">
                <span className="pos">{me.rank}</span>
                <div className="av">{me.ini}</div>
                <div className="nm">
                  {me.name}
                  <span style={{ font: "700 8px/1 var(--font-grotesk)", letterSpacing: ".1em", textTransform: "uppercase", background: "var(--cyan)", color: "var(--navy)", borderRadius: 4, padding: "2px 5px", marginLeft: 6 }}>Moi</span>
                  <small>{me.balance.toLocaleString("fr-FR")} cr.</small>
                </div>
                <span className="pts">{me.wins} vic.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CompetitionsView({
  competitions, openBetModal,
}: CompetitionsViewProps) {
  return (
    <>
      <div className="view-header">
        <h1>Compétitions</h1>
        <p>{competitions.length} événement{competitions.length !== 1 ? "s" : ""} à venir · Clique pour voir la startlist et parier</p>
      </div>
      <div className="comp-list">
        {competitions.map((c) => (
          <div key={c.id} className={`comp-card${c.featured ? " comp-featured" : ""}`}>
            <div className="comp-card-top" onClick={() => openBetModal(c.id, c.name)}>
              <div className="comp-left">
                {c.featured && <span className="comp-badge"><Bolt c="#FF7A45" /> Featured</span>}
                <h2 className="comp-name">{c.name}</h2>
                <div className="comp-meta">
                  <span><ColPin />{c.location}</span>
                  <span className="cflag">{c.flag}</span>
                  <span>{fmtDate(c.date)}</span>
                  <span>{c.category}</span>
                  {c.typeCompetition && <span>{c.typeCompetition === "sprint" ? "Sprint" : "Classique"}</span>}
                </div>
              </div>
              <div className="comp-right">
                {c.bettors > 0 && (
                  <div className="comp-bettors">
                    <span className="bv">{c.bettors.toLocaleString("fr-FR")}</span>
                    <span className="bl">parieurs</span>
                  </div>
                )}
                <div className="comp-chevron"><ChevRight /></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ClassementView({ effectiveLb, onOpenProfile }: ClassementViewProps) {
  const top3 = effectiveLb.filter((p) => p.rank <= 3);
  const rest = effectiveLb.filter((p) => p.rank > 3 && !p.isMe);
  const me   = effectiveLb.find((p) => p.isMe);

  function openProfile(p: Player) {
    if (p.id) onOpenProfile(p.id);
  }
  function onProfileKeyDown(e: React.KeyboardEvent, p: Player) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProfile(p); }
  }

  return (
    <>
      <div className="view-header">
        <h1>Classement</h1>
        <p>Saison 2026 · {effectiveLb.length} joueurs</p>
      </div>

      <div className="podium">
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((p) => (
          <div
            key={p!.id}
            className={`pod pod-${p!.rank}`}
            role="button"
            tabIndex={0}
            onClick={() => openProfile(p!)}
            onKeyDown={(e) => onProfileKeyDown(e, p!)}
          >
            <div className="pod-star"><StarIcon filled /></div>
            <div className="pod-avatar" style={{ borderColor: rankColors[p!.rank] }}>
              {p!.avatarUrl ? <img src={p!.avatarUrl} alt="" /> : <span>{p!.ini}</span>}
            </div>
            <div className="pod-rank" style={{ color: rankColors[p!.rank] }}>#{p!.rank}</div>
            <div className="pod-name">{p!.name}<InstaLink handle={p!.instagram} /></div>
            <div className="pod-bal">{p!.balance.toLocaleString("fr-FR")} cr.</div>
          </div>
        ))}
      </div>

      <div className="lb-list">
        {rest.map((p) => (
          <div
            key={p.id}
            className="lb-row"
            role="button"
            tabIndex={0}
            onClick={() => openProfile(p)}
            onKeyDown={(e) => onProfileKeyDown(e, p)}
          >
            <span className="lb-rank">{p.rank}</span>
            <div className="lb-avatar">{p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : <span>{p.ini}</span>}</div>
            <span className="lb-name">{p.name}<InstaLink handle={p.instagram} /></span>
            <span className="lb-wins">{p.wins} victoires</span>
            <span className="lb-bal">{p.balance.toLocaleString("fr-FR")} cr.</span>
            {p.streak > 0 && <span className="lb-streak"><ColFlame />{p.streak}</span>}
          </div>
        ))}

        {me && (
          <>
            <div className="lb-gap">···</div>
            <div
              className="lb-row lb-me"
              role="button"
              tabIndex={0}
              onClick={() => openProfile(me)}
              onKeyDown={(e) => onProfileKeyDown(e, me)}
            >
              <span className="lb-rank">{me.rank}</span>
              <div className="lb-avatar lb-avatar-me">{me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : <span>{me.ini}</span>}</div>
              <span className="lb-name">{me.name} <span className="me-tag">Moi</span><InstaLink handle={me.instagram} /></span>
              <span className="lb-wins">{me.wins} victoires</span>
              <span className="lb-bal">{me.balance.toLocaleString("fr-FR")} cr.</span>
              {me.streak > 0 && <span className="lb-streak"><ColFlame />{me.streak}</span>}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PlayerProfileView({ playerId, onBack }: PlayerProfileViewProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "won">("all");
  const [friendState, setFriendState] = useState<{ status: FriendshipStatus; id: string | null } | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const qs = historyFilter === "won" ? "?result=won" : "";
    fetch(`/api/users/${playerId}/profile${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        if (data.friendshipStatus) setFriendState({ status: data.friendshipStatus, id: data.friendshipId ?? null });
      })
      .catch(() => { if (!cancelled) setError("Impossible de charger ce profil."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerId, historyFilter]);

  async function addFriend() {
    setFriendBusy(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: playerId }),
      });
      const data = await res.json();
      if (res.ok) setFriendState({ status: data.status, id: data.friendshipId });
    } finally {
      setFriendBusy(false);
    }
  }

  async function respondFriend(action: "accept" | "decline") {
    if (!friendState?.id) return;
    setFriendBusy(true);
    try {
      const res = await fetch(`/api/friends/${friendState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) setFriendState(s => s && { ...s, status: action === "accept" ? "friends" : "none" });
    } finally {
      setFriendBusy(false);
    }
  }

  async function removeFriend() {
    if (!friendState?.id) return;
    setFriendBusy(true);
    try {
      const res = await fetch(`/api/friends/${friendState.id}`, { method: "DELETE" });
      if (res.ok) setFriendState({ status: "none", id: null });
    } finally {
      setFriendBusy(false);
    }
  }

  return (
    <>
      <button className="player-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Retour au classement
      </button>

      {loading && !profile && <p style={{ color: "var(--sub, #5c7c8c)", fontFamily: "var(--font-archivo)", padding: "24px 0" }}>Chargement du profil…</p>}
      {!loading && error && <p style={{ color: "#FF7A45", fontFamily: "var(--font-archivo)", padding: "24px 0" }}>{error}</p>}

      {!error && profile && (
        <>
          <div className="profil-hero">
            <div className="glow" />
            <svg className="water" viewBox="0 0 1130 140" preserveAspectRatio="none" fill="none">
              <path d="M0 74c142 0 142-32 284-32s142 32 284 32 142-32 284-32 142 32 284 32v66H0Z" fill="#0E3A52" opacity=".6" />
              <path d="M0 92c142 0 142-24 284-24s142 24 284 24 142-24 284-24 142 24 284 24v48H0Z" fill="#11C2C2" opacity=".1" />
            </svg>
            <div className="profil-hero-inner">
              <div className="profil-avatar">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{profile.initials}</span>}
              </div>
              <span className="profil-eyebrow">Profil joueur · Saison 2026</span>
              <h1 className="profil-name">{profile.username}<InstaLink handle={profile.instagram} /></h1>
              {profile.bio && <p className="profil-bio">{profile.bio}</p>}
              <span className="profil-rank">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.5 7.1 18.2l.9-5.5-4-3.9 5.5-.8L12 3Z" stroke="#28D7E6" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                Rang {profile.rank} · Saison 2026
              </span>
              {friendState && (
                <div className="profil-friend-actions">
                  {friendState.status === "none" && (
                    <button className="editprofile-save" disabled={friendBusy} onClick={addFriend}>+ Ajouter en ami</button>
                  )}
                  {friendState.status === "pending_outgoing" && (
                    <button className="linkathlete-skip" disabled={friendBusy} onClick={removeFriend}>Demande envoyée · Annuler</button>
                  )}
                  {friendState.status === "pending_incoming" && (
                    <div className="linkathlete-actions">
                      <button className="editprofile-save" disabled={friendBusy} onClick={() => respondFriend("accept")}>Accepter</button>
                      <button className="linkathlete-skip" disabled={friendBusy} onClick={() => respondFriend("decline")}>Refuser</button>
                    </div>
                  )}
                  {friendState.status === "friends" && (
                    <button className="linkathlete-skip" disabled={friendBusy} onClick={removeFriend}>Amis ✓ · Retirer</button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="profil-stats">
            <div className="profil-stat">
              <span className="ps-val">{profile.totalBets}</span>
              <span className="ps-label">Paris</span>
            </div>
            <div className="profil-stat">
              <span className="ps-val">{profile.wins}</span>
              <span className="ps-label">Victoires</span>
            </div>
            <div className="profil-stat">
              <span className="ps-val">{profile.winRate}%</span>
              <span className="ps-label">Win rate</span>
            </div>
            <div className="profil-stat">
              <span className="ps-val">{profile.balance.toLocaleString("fr-FR")}</span>
              <span className="ps-label">Crédits</span>
            </div>
          </div>

          <div className="profil-section">
            <div className="profil-section-head">
              <span>Historique des paris</span>
              <span className="ps-count">{profile.bets.length} paris</span>
            </div>
            <div className="cat-tabs">
              <button className={`cat-tab${historyFilter === "all" ? " active" : ""}`} onClick={() => setHistoryFilter("all")}>Tous</button>
              <button className={`cat-tab${historyFilter === "won" ? " active" : ""}`} onClick={() => setHistoryFilter("won")}>Victoires</button>
            </div>
            <div className="history-list">
              {profile.bets.length === 0 ? (
                <p style={{ color: "#5c7c8c", fontFamily: "var(--font-archivo)", fontSize: "13px", padding: "16px 0" }}>
                  {historyFilter === "won" ? "Aucun pari gagné pour l'instant." : "Aucun pari pour l'instant."}
                </p>
              ) : profile.bets.map((b) => {
                const showGain = b.result === "win"
                  ? `+${(b.gainReel ?? b.gainPotentiel ?? Math.round(b.stake * b.odds)).toLocaleString("fr-FR")}`
                  : b.result === "loss"
                    ? `-${b.stake}`
                    : `${(b.gainPotentiel ?? Math.round(b.stake * b.odds)).toLocaleString("fr-FR")} en jeu`;
                return (
                  <div key={b.id} className={`history-item hi-${b.result}`}>
                    <div className={`hi-dot hi-dot-${b.result}`} />
                    <div className="hi-body">
                      <div className="hi-event">{b.event}</div>
                      <div className="hi-athlete">{b.athlete} · {b.odds.toFixed(2)}</div>
                    </div>
                    <div className="hi-right">
                      <div className={`hi-result hi-result-${b.result}`}>{showGain}</div>
                      <div className="hi-date">{fmtDate(b.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function LeagueView({ leagueId, onBack }: LeagueViewProps) {
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    fetch(`/api/leagues/${leagueId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
        return res.json();
      })
      .then((data) => setLeague(data))
      .catch(() => setError("Impossible de charger cette ligue."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [leagueId]);

  async function copyCode() {
    if (!league) return;
    try {
      await navigator.clipboard.writeText(league.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard indisponible, tant pis */ }
  }

  async function newSeason() {
    if (!league || busy) return;
    if (!confirm("Démarrer une nouvelle saison ? Les gains de tous les membres repartent à zéro.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/new-season`, { method: "POST" });
      if (res.ok) load(); else setError("Impossible de démarrer une nouvelle saison.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLeague() {
    if (!league || busy) return;
    if (!confirm(`Supprimer définitivement la ligue "${league.name}" ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, { method: "DELETE" });
      if (res.ok) onBack(); else setError("Impossible de supprimer la ligue.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveLeague() {
    if (!league || busy) return;
    if (!confirm(`Quitter la ligue "${league.name}" ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/leave`, { method: "POST" });
      if (res.ok) onBack(); else setError("Impossible de quitter la ligue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="player-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Retour au profil
      </button>

      {loading && <p style={{ color: "var(--sub, #5c7c8c)", fontFamily: "var(--font-archivo)", padding: "24px 0" }}>Chargement de la ligue…</p>}
      {!loading && error && <p style={{ color: "#FF7A45", fontFamily: "var(--font-archivo)", padding: "24px 0" }}>{error}</p>}

      {!loading && !error && league && (
        <>
          <div className="view-header">
            <h1>{league.name}</h1>
            <p>Saison {league.currentSeason} · {league.members.length} membre{league.members.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="league-invite">
            <span>Code d&apos;invitation</span>
            <button className="league-invite-code" onClick={copyCode}>
              {league.inviteCode} {copied ? "· Copié !" : ""}
            </button>
          </div>

          <div className="lb-list">
            {league.members.map((m) => (
              <div key={m.userId} className="lb-row">
                <span className="lb-rank">{m.rank}</span>
                <div className="lb-avatar">{m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : <span>{m.initials}</span>}</div>
                <span className="lb-name">{m.username}</span>
                <span className="lb-bal" style={{ color: m.gain >= 0 ? "var(--cyan)" : "var(--coral)" }}>
                  {m.gain >= 0 ? "+" : ""}{m.gain.toLocaleString("fr-FR")} cr.
                </span>
              </div>
            ))}
          </div>

          {league.isCreator ? (
            <div className="profil-actions" style={{ marginTop: 20 }}>
              <button className="profil-edit-btn" disabled={busy} onClick={newSeason}>Nouvelle saison</button>
              <button className="profil-edit-btn" disabled={busy} onClick={deleteLeague}>Supprimer la ligue</button>
            </div>
          ) : (
            <div className="profil-actions" style={{ marginTop: 20 }}>
              <button className="profil-edit-btn" disabled={busy} onClick={leaveLeague}>Quitter la ligue</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ProfilView({ name, initials, userEmail, myRank, balance, effectiveBets, signOut, avatarUrl, bio, instagram, onEditProfile, linkedAthlete, onLinkAthlete, onOpenProfile, onOpenLeague }: ProfilViewProps) {
  const totalWins = effectiveBets.filter((b) => b.result === "win").length;
  const totalBets = effectiveBets.length;
  const winRate   = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  function loadFriends() {
    fetch("/api/friends")
      .then(res => res.json())
      .then((data) => {
        setFriends(data.friends ?? []);
        setIncoming(data.incoming ?? []);
      })
      .finally(() => setFriendsLoaded(true));
  }

  useEffect(() => { loadFriends(); }, []);

  async function respondIncoming(friendshipId: string, action: "accept" | "decline") {
    await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadFriends();
  }

  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [leaguesLoaded, setLeaguesLoaded] = useState(false);
  const [leagueForm, setLeagueForm] = useState<"none" | "create" | "join">("none");
  const [leagueInput, setLeagueInput] = useState("");
  const [leagueBusy, setLeagueBusy] = useState(false);
  const [leagueError, setLeagueError] = useState("");

  function loadLeagues() {
    fetch("/api/leagues")
      .then(res => res.json())
      .then((data) => setLeagues(data.leagues ?? []))
      .finally(() => setLeaguesLoaded(true));
  }

  useEffect(() => { loadLeagues(); }, []);

  async function submitLeagueForm() {
    if (!leagueInput.trim() || leagueBusy) return;
    setLeagueBusy(true);
    setLeagueError("");
    try {
      const res = await fetch(leagueForm === "create" ? "/api/leagues" : "/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leagueForm === "create" ? { name: leagueInput.trim() } : { code: leagueInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLeagueError(data.error ?? "Erreur"); return; }
      setLeagueInput("");
      setLeagueForm("none");
      loadLeagues();
    } catch {
      setLeagueError("Erreur réseau");
    } finally {
      setLeagueBusy(false);
    }
  }

  return (
    <>
      <div className="profil-hero">
        <div className="glow" />
        <svg className="water" viewBox="0 0 1130 140" preserveAspectRatio="none" fill="none">
          <path d="M0 74c142 0 142-32 284-32s142 32 284 32 142-32 284-32 142 32 284 32v66H0Z" fill="#0E3A52" opacity=".6" />
          <path d="M0 92c142 0 142-24 284-24s142 24 284 24 142-24 284-24 142 24 284 24v48H0Z" fill="#11C2C2" opacity=".1" />
        </svg>
        <div className="profil-hero-inner">
          <div className="profil-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <span className="profil-eyebrow">Mon profil · Saison 2026</span>
          <h1 className="profil-name">{name}<InstaLink handle={instagram} /></h1>
          <p className="profil-email">{userEmail}</p>
          {bio && <p className="profil-bio">{bio}</p>}
          <span className="profil-rank">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.5 7.1 18.2l.9-5.5-4-3.9 5.5-.8L12 3Z" stroke="#28D7E6" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            Rang {myRank ?? "—"} · Saison 2026
          </span>
          <div className="profil-actions">
            <button className="profil-edit-btn" onClick={onEditProfile}>Modifier le profil</button>
            {linkedAthlete ? (
              <span className="profil-linked">Athlète lié · {linkedAthlete.prenom} {linkedAthlete.nom}</span>
            ) : (
              <button className="profil-edit-btn" onClick={onLinkAthlete}>Lier mon profil athlète</button>
            )}
          </div>
        </div>
      </div>

      <div className="profil-stats">
        <div className="profil-stat">
          <span className="ps-val">{totalBets}</span>
          <span className="ps-label">Paris</span>
        </div>
        <div className="profil-stat">
          <span className="ps-val">{totalWins}</span>
          <span className="ps-label">Victoires</span>
        </div>
        <div className="profil-stat">
          <span className="ps-val">{winRate}%</span>
          <span className="ps-label">Win rate</span>
        </div>
        <div className="profil-stat">
          <span className="ps-val">{balance.toLocaleString("fr-FR")}</span>
          <span className="ps-label">Crédits</span>
        </div>
      </div>

      <div className="profil-section">
        <div className="profil-section-head">
          <span>Historique des paris</span>
          <span className="ps-count">{effectiveBets.length} paris</span>
        </div>
        <div className="history-list">
          {effectiveBets.length === 0 ? (
            <p style={{ color: "#5c7c8c", fontFamily: "var(--font-archivo)", fontSize: "13px", padding: "16px 0" }}>
              Aucun pari pour l&apos;instant. Sélectionne des cotes et mise !
            </p>
          ) : effectiveBets.map((b) => {
            const showGain = b.result === "win"
              ? `+${(b.gainReel ?? b.gainPotentiel ?? Math.round(b.stake * b.odds)).toLocaleString("fr-FR")}`
              : b.result === "loss"
                ? `-${b.stake}`
                : `${(b.gainPotentiel ?? Math.round(b.stake * b.odds)).toLocaleString("fr-FR")} en jeu`;
            return (
              <div key={b.id} className={`history-item hi-${b.result}`}>
                <div className={`hi-dot hi-dot-${b.result}`} />
                <div className="hi-body">
                  <div className="hi-event">{b.event}</div>
                  <div className="hi-athlete">{b.athlete} · {b.odds.toFixed(2)}</div>
                </div>
                <div className="hi-right">
                  <div className={`hi-result hi-result-${b.result}`}>{showGain}</div>
                  <div className="hi-date">{fmtDate(b.date)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="profil-section">
        <div className="profil-section-head">
          <span>Mes amis</span>
          <span className="ps-count">{friends.length} ami{friends.length !== 1 ? "s" : ""}</span>
        </div>
        {incoming.length > 0 && (
          <div className="friend-requests">
            {incoming.map((f) => (
              <div key={f.friendshipId} className="friend-request-row">
                <div className="av">{f.avatarUrl ? <img src={f.avatarUrl} alt="" /> : f.initials}</div>
                <span className="nm">{f.username}</span>
                <div className="friend-request-actions">
                  <button className="editprofile-save" onClick={() => respondIncoming(f.friendshipId, "accept")}>Accepter</button>
                  <button className="linkathlete-skip" onClick={() => respondIncoming(f.friendshipId, "decline")}>Refuser</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="history-list">
          {friendsLoaded && friends.length === 0 && incoming.length === 0 ? (
            <p style={{ color: "#5c7c8c", fontFamily: "var(--font-archivo)", fontSize: "13px", padding: "16px 0" }}>
              Pas encore d&apos;amis. Ajoute des joueurs depuis le classement !
            </p>
          ) : friends.map((f) => (
            <div key={f.friendshipId} className="home-lb-row" role="button" tabIndex={0} onClick={() => onOpenProfile(f.userId)}>
              <div className="av">{f.avatarUrl ? <img src={f.avatarUrl} alt="" /> : f.initials}</div>
              <div className="nm">{f.username}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="profil-section">
        <div className="profil-section-head">
          <span>Mes ligues</span>
          <span className="ps-count">{leagues.length} ligue{leagues.length !== 1 ? "s" : ""}</span>
        </div>

        {leagueForm === "none" ? (
          <div className="profil-actions" style={{ marginBottom: 14 }}>
            <button className="profil-edit-btn" onClick={() => { setLeagueForm("create"); setLeagueError(""); }}>Créer une ligue</button>
            <button className="profil-edit-btn" onClick={() => { setLeagueForm("join"); setLeagueError(""); }}>Rejoindre une ligue</button>
          </div>
        ) : (
          <div className="league-form">
            <input
              type="text"
              value={leagueInput}
              onChange={(e) => setLeagueInput(leagueForm === "join" ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={leagueForm === "create" ? "Nom de la ligue" : "Code d'invitation"}
              maxLength={leagueForm === "create" ? 60 : 8}
            />
            <div className="linkathlete-actions">
              <button className="editprofile-save" disabled={leagueBusy || !leagueInput.trim()} onClick={submitLeagueForm}>
                {leagueBusy ? "…" : leagueForm === "create" ? "Créer" : "Rejoindre"}
              </button>
              <button className="linkathlete-skip" onClick={() => { setLeagueForm("none"); setLeagueInput(""); setLeagueError(""); }}>Annuler</button>
            </div>
            {leagueError && <p className="catmodal-status err">{leagueError}</p>}
          </div>
        )}

        <div className="history-list">
          {leaguesLoaded && leagues.length === 0 ? (
            <p style={{ color: "#5c7c8c", fontFamily: "var(--font-archivo)", fontSize: "13px", padding: "16px 0" }}>
              Pas encore de ligue. Crée la tienne ou rejoins celle de ton club !
            </p>
          ) : leagues.map((l) => (
            <div key={l.id} className="home-lb-row" role="button" tabIndex={0} onClick={() => onOpenLeague(l.id)}>
              <div className="nm">
                {l.name}
                <small>Saison {l.currentSeason} · {l.memberCount} membre{l.memberCount !== 1 ? "s" : ""}</small>
              </div>
              <span className="pts">#{l.myRank}</span>
            </div>
          ))}
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
}

/* ----------------------------------------------------------------
   Page
---------------------------------------------------------------- */
export default function DashboardPage() {
  const supabase = createClient();

  const [view,          setView]          = useState<View>("home");
  const [balance,       setBalance]       = useState(0);
  const [coupon,        setCoupon]        = useState<Record<string, Odd>>({});
  const [stake,         setStake]         = useState(50);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [betLoading,    setBetLoading]    = useState(false);
  const [cd,            setCd]            = useState({ d: "00", h: "00", m: "00", s: "00" });
  const [dbComps,       setDbComps]       = useState<Competition[] | null>(null);
  const [cdTarget,      setCdTarget]      = useState<Date>(new Date("2026-07-16T10:00:00"));
  const [name,          setName]          = useState("Joueur");
  const [initials,      setInitials]      = useState("??");
  const [userEmail,     setUserEmail]     = useState("");
  const [userId,        setUserId]        = useState("");
  const [username,      setUsername]     = useState("");
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null);
  const [bio,           setBio]           = useState("");
  const [instagram,     setInstagram]     = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [linkedAthlete, setLinkedAthlete] = useState<LinkedAthlete | null>(null);
  const [linkAthleteOpen, setLinkAthleteOpen] = useState(false);
  const [betHistory,    setBetHistory]    = useState<BetRecord[]>([]);
  const [dbLeaderboard, setDbLeaderboard] = useState<Player[]>([]);
  const [betModal, setBetModal] = useState<{ compId: string; compNom: string } | null>(null);
  const [viewedPlayerId, setViewedPlayerId] = useState<string | null>(null);
  const [viewedLeagueId, setViewedLeagueId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ icon: ReactNode; msg: ReactNode; err: boolean; show: boolean }>({
    icon: null, msg: null, err: false, show: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const navRef     = useRef<HTMLElement>(null);
  const pillRef    = useRef<HTMLDivElement>(null);

  /* derived */
  const competitions  = dbComps ?? [];
  const effectiveBets = betHistory;
  const effectiveLb   = dbLeaderboard;
  const myRank        = effectiveLb.find(p => p.isMe)?.rank ?? null;
  const pendingCount  = effectiveBets.filter(b => b.result === "pending").length;
  const streak        = (() => {
    let s = 0;
    for (const b of effectiveBets) {
      if (b.result === "pending") continue;
      if (b.result === "win") s++; else break;
    }
    return s;
  })();

  /* coupon derived */
  const selected  = Object.values(coupon);
  const count     = selected.length;
  const totalOdds = selected.reduce((t, o) => t * o.val, 1);
  const gain      = Math.round((stake || 0) * totalOdds);

  /* profil + solde */
  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";
      setUserEmail(email);
      setUserId(data.user?.id ?? "");
      if (email) {
        const base   = email.split("@")[0].replace(/[._-]+/g, " ").trim();
        const pretty = base.charAt(0).toUpperCase() + base.slice(1);
        setName(pretty);
        const parts = base.split(" ");
        setInitials(parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : base.slice(0, 2).toUpperCase());
      }
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const prof = await res.json();
          setBalance(Number(prof.balance ?? 0));
          if (prof.username) { setName(prof.username); setInitials(prof.username.slice(0, 2).toUpperCase()); setUsername(prof.username); }
          setAvatarUrl(prof.avatarUrl ?? null);
          setBio(prof.bio ?? "");
          setInstagram(prof.instagram ?? null);
          setLinkedAthlete(prof.linkedAthlete ?? null);
        }
      } catch { /* ignore */ }
    }
    loadProfile();
  }, [supabase]);

  async function fetchBetHistory() {
    try {
      const res = await fetch("/api/user/bets");
      if (res.ok) setBetHistory(await res.json());
    } catch { /* ignore */ }
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch("/api/user/leaderboard");
      if (res.ok) setDbLeaderboard(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchBetHistory();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    async function fetchComps() {
      const { data } = await supabase
        .from("competitions")
        .select("id, nom, date, discipline, lieu, type_competition, participants(id, nom, pays, cote, categorie, code_bateau)")
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
          typeCompetition: c.type_competition ?? null,
          odds: parts.map((p: any) => ({
            id:            `${p.id}:TOP_1`,
            participantId: p.id,
            betType:       "TOP_1" as const,
            betLabel:      BET_LABELS.TOP_1,
            nm:            p.nom,
            ctry:          "FR",
            note:          cleanPays(p.pays ?? ""),
            val:           p.cote != null ? parseFloat(p.cote) : 1.00,
            fav:           minCote != null && p.cote === minCote,
            competitionId: c.id,
            categorie:     p.categorie ?? "",
            codeBateau:    p.code_bateau ?? null,
          })),
        };
      });
      setDbComps(mapped);
      if (mapped[0]?.date) setCdTarget(new Date(mapped[0].date + "T10:00:00"));
    }
    fetchComps();
  }, [supabase]);

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

  function openBetModal(compId: string, compNom: string) {
    setBetModal({ compId, compNom });
  }

  function openPlayerProfile(id: string) {
    setViewedPlayerId(id);
    navigate("joueur");
  }

  function openLeague(id: string) {
    setViewedLeagueId(id);
    navigate("ligue");
  }

  async function addCredits() {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deposit: 1000 }),
      });
      const json = await res.json();
      if (res.ok) {
        setBalance(Number(json.balance));
        showToast(<Check c="#28D7E6" />, <>Solde rechargé · <span>{Number(json.balance).toLocaleString("fr-FR")} cr.</span></>);
      } else {
        showToast(<XIcon c="#FF7A45" />, json.error ?? "Erreur", true);
      }
    } catch {
      showToast(<XIcon c="#FF7A45" />, "Erreur réseau", true);
    }
  }

  async function validate() {
    const s = Math.max(0, stake || 0);
    if (s <= 0 || count === 0) return;
    if (s > balance) { showToast(<XIcon c="#FF7A45" />, "Solde insuffisant", true); return; }
    if (betLoading) return;

    setBetLoading(true);
    try {
      const compIds = [...new Set(selected.map(o => o.competitionId))];
      const firstComp = competitions.find(c => c.id === compIds[0]);

      const selectionsPayload = selected.map(o => ({
        participantId:  o.participantId,
        betType:        o.betType,
        nom:            o.nm,
        cote:           o.val,
        competitionId:  o.competitionId ?? "",
        competitionNom: competitions.find(c => c.id === o.competitionId)?.name ?? "",
        categorie:      o.categorie ?? "",
      }));

      const res  = await fetch("/api/user/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: selectionsPayload, stake: s }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(<XIcon c="#FF7A45" />, json.error ?? "Erreur", true);
        return;
      }

      setBalance(Number(json.newBalance));
      setCoupon({});
      setDrawerOpen(false);
      showToast(<Check c="#28D7E6" />, <>Pari validé · gain potentiel <span>{Math.round(json.gainPotentiel).toLocaleString("fr-FR")} cr.</span></>);
      void firstComp;
      fetchBetHistory();
    } catch {
      showToast(<XIcon c="#FF7A45" />, "Erreur réseau", true);
    } finally {
      setBetLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = "/";
  }

  function navigate(v: View | "drawer") {
    if (v === "drawer") { setDrawerOpen(true); return; }
    setView(v);
  }

  const topActive = { home: 0, competitions: 1, classement: 2, profil: -1, joueur: -1, ligue: -1 }[view] ?? -1;
  const botActive = { home: 0, competitions: 1, classement: 3, profil: 4, joueur: -1, ligue: -1 }[view] ?? -1;

  useLayoutEffect(() => {
    const nav  = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const links = nav.querySelectorAll<HTMLElement>("a");
    const a = topActive >= 0 ? links[topActive] : undefined;
    if (!a) { pill.style.opacity = "0"; return; }
    pill.style.width     = a.offsetWidth  + "px";
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
    pill.style.opacity   = "1";
  }, [topActive]);

  useEffect(() => {
    const nav  = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const obs = new ResizeObserver(() => {
      const links = nav.querySelectorAll<HTMLElement>("a");
      const a = topActive >= 0 ? links[topActive] : undefined;
      if (!a) return;
      pill.style.width     = a.offsetWidth  + "px";
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
    });
    obs.observe(nav);
    return () => obs.disconnect();
  }, [topActive]);

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

          <nav className="links" ref={navRef}>
            <div className="nav-pill" ref={pillRef} />
            {TOPNAV.map((n, i) => (
              <a key={n.t} className={i === topActive ? "active" : ""} onClick={() => navigate(n.v)}>
                <NavIcon name={n.ic} /><span>{n.t}</span>
              </a>
            ))}
          </nav>

          <div className="head-right">
            <div className="balance" aria-label={`Solde : ${balance.toLocaleString("fr-FR")} crédits`}>
              <span className="v">{balance.toLocaleString("fr-FR")}</span>
              <span className="kb-coin" aria-hidden="true">
                <span className="kb-face">
                  <span className="kb-letters">KB</span>
                </span>
              </span>
              <button className="plus" onClick={addCredits} aria-label="Recharger">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#28D7E6" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <button className="avatar" onClick={() => navigate("profil")} title="Profil">
              <span className="pic">{initials}</span>
              <span className="who">
                <span className="nm">{name}</span>
                <span className="rk">Rang {myRank ?? "—"}</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ============ MAIN ============ */}
      <main>
        <div className="wrap">
          {view === "home" && (
            <HomeView
              competitions={competitions}
              name={name}
              cd={cd}
              navigate={navigate}
              myRank={myRank}
              pendingCount={pendingCount}
              streak={streak}
              effectiveBets={effectiveBets}
              effectiveLb={effectiveLb}
              openBetModal={openBetModal}
            />
          )}
          {view === "competitions" && (
            <CompetitionsView
              competitions={competitions}
              openBetModal={openBetModal}
            />
          )}
          {view === "classement" && <ClassementView effectiveLb={effectiveLb} onOpenProfile={openPlayerProfile} />}
          {view === "joueur" && viewedPlayerId && (
            <PlayerProfileView playerId={viewedPlayerId} onBack={() => navigate("classement")} />
          )}
          {view === "ligue" && viewedLeagueId && (
            <LeagueView leagueId={viewedLeagueId} onBack={() => navigate("profil")} />
          )}
          {view === "profil" && (
            <ProfilView
              name={name}
              initials={initials}
              userEmail={userEmail}
              myRank={myRank}
              balance={balance}
              effectiveBets={effectiveBets}
              signOut={signOut}
              avatarUrl={avatarUrl}
              bio={bio}
              instagram={instagram}
              onEditProfile={() => setEditProfileOpen(true)}
              linkedAthlete={linkedAthlete}
              onLinkAthlete={() => setLinkAthleteOpen(true)}
              onOpenProfile={openPlayerProfile}
              onOpenLeague={openLeague}
            />
          )}
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
                <div className="ev">{o.note}{o.betType !== "TOP_1" && <> · {o.betLabel}</>}</div>
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
            <button className="validate" onClick={validate} disabled={betLoading} style={{ opacity: betLoading ? 0.6 : 1 }}>
              {betLoading ? "Validation…" : "Valider le pari"}
            </button>
          </div>
        )}
      </aside>

      {/* ============ MODAL PARIS PAR CATÉGORIE ============ */}
      {betModal && (
        <CategoryBetModal
          open
          onClose={() => setBetModal(null)}
          competitionId={betModal.compId}
          competitionNom={betModal.compNom}
          odds={competitions.find(c => c.id === betModal.compId)?.odds ?? []}
          typeCompetition={competitions.find(c => c.id === betModal.compId)?.typeCompetition}
          coupon={coupon}
          toggle={toggle}
        />
      )}

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        userId={userId}
        initials={initials}
        username={username}
        avatarUrl={avatarUrl}
        bio={bio}
        instagram={instagram}
        onSaved={(updates) => {
          if (updates.username) { setName(updates.username); setInitials(updates.username.slice(0, 2).toUpperCase()); setUsername(updates.username); }
          if (updates.bio != null) setBio(updates.bio);
          if (updates.avatarUrl) setAvatarUrl(updates.avatarUrl);
          if (updates.instagram !== undefined) setInstagram(updates.instagram);
        }}
      />

      <LinkAthleteModal
        open={linkAthleteOpen}
        onClose={() => setLinkAthleteOpen(false)}
        onLinked={(athlete) => setLinkedAthlete(athlete)}
      />

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
