export default function Logo({ id = "h" }: { id?: string }) {
  return (
    <span className="flex items-center gap-[11px]">
      <svg viewBox="0 0 34 38" fill="none" aria-hidden="true" className="w-[28px] h-[32px] flex-none">
        <path d="M17 2C10 12 4 18.5 4 25a13 13 0 0 0 26 0C30 18.5 24 12 17 2Z" fill={`url(#d${id})`} />
        <path d="M9.5 26.4c2.4 0 2.4 2.4 4.8 2.4s2.4-2.4 4.8-2.4 2.4 2.4 4.8 2.4" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" />
        <path d="M10.3 31.5c2.1 0 2.1 2 4.2 2s2.1-2 4.2-2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />
        <defs>
          <linearGradient id={`d${id}`} x1="4" y1="2" x2="30" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#28D7E6" /><stop offset="1" stopColor="#1F73FF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="wm-box">
        <span className="wmtxt">Kayak<span className="b">bet</span></span>
        <svg className="wmwave" viewBox="0 0 240 20" preserveAspectRatio="none" fill="none">
          <path d="M2 13c36 0 36-8 72-8s36 8 72 8 36-8 92-8" stroke="#28D7E6" strokeWidth="5" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
    </span>
  );
}
