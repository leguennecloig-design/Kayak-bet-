// Layout partagé par toutes les pages /admin/*
// La vérification admin est faite dans chaque page individuelle
// (layout.tsx ne peut pas utiliser redirect() de façon fiable dans Next.js 14)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-deep text-white">
      <div className="border-b border-[var(--border)] bg-[rgba(7,31,45,0.9)] backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* Logo drop */}
            <svg viewBox="0 0 34 38" fill="none" className="w-6 h-7">
              <path d="M17 2C10 12 4 18.5 4 25a13 13 0 0 0 26 0C30 18.5 24 12 17 2Z" fill="url(#adh)" />
              <path d="M9.5 26.4c2.4 0 2.4 2.4 4.8 2.4s2.4-2.4 4.8-2.4 2.4 2.4 4.8 2.4" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" />
              <defs>
                <linearGradient id="adh" x1="4" y1="2" x2="30" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#28D7E6" /><stop offset="1" stopColor="#1F73FF" />
                </linearGradient>
              </defs>
            </svg>
            <span className="font-anton italic uppercase text-white text-[17px]">
              Kayak<span className="text-cyan">bet</span>
            </span>
            <span className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[var(--cyan)] bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.3)] rounded-[5px] px-[7px] py-[4px] ml-1">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="/admin"
              className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Compétitions
            </a>
            <a
              href="/admin/athletes"
              className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Athlètes
            </a>
            <a
              href="/admin/data"
              className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Données FFCK
            </a>
            <a
              href="/admin/cotes"
              className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cotes
            </a>
            <a
              href="/admin/startlist"
              className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Startlist
            </a>
            <a
              href="/app"
              className="font-archivo font-semibold text-[13px] text-[#9fbac6] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              ← App
            </a>
          </nav>
        </div>
      </div>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
