export default function Logo({ id = "h" }: { id?: string }) {
  return (
    <span className="flex items-center gap-[11px]">
      <svg
        viewBox="0 0 34 38"
        fill="none"
        aria-hidden="true"
        className="w-[30px] h-[34px] flex-none"
      >
        <path
          d="M17 2C10 12 4 18.5 4 25a13 13 0 0 0 26 0C30 18.5 24 12 17 2Z"
          fill={`url(#d${id})`}
        />
        <path
          d="M9.5 26.4c2.4 0 2.4 2.4 4.8 2.4s2.4-2.4 4.8-2.4 2.4 2.4 4.8 2.4"
          stroke="#fff"
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M10.3 31.5c2.1 0 2.1 2 4.2 2s2.1-2 4.2-2"
          stroke="#fff"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity=".7"
        />
        <defs>
          <linearGradient
            id={`d${id}`}
            x1="4"
            y1="2"
            x2="30"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#28D7E6" />
            <stop offset="1" stopColor="#1F73FF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-archivo font-black italic text-[23px] leading-[0.9] tracking-[-.02em] text-white">
        Kayak<span className="text-cyan">bet</span>
      </span>
    </span>
  );
}
