import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        deep: "#071F2D",
        navy: "#0A2A3D",
        surface: "#0C3146",
        "surface-2": "#0E3A52",
        text: "#E9F3F7",
        soft: "#A2BCC8",
        mute: "#6B8896",
        turq: "#11C2C2",
        cyan: "#28D7E6",
        blue: "#1F73FF",
        coral: "#FF7A45",
      },
      fontFamily: {
        anton: ["var(--font-anton)", "sans-serif"],
        archivo: ["var(--font-archivo)", "system-ui", "sans-serif"],
        grotesk: ["var(--font-grotesk)", "monospace"],
      },
      boxShadow: {
        soft: "0 26px 54px -30px rgba(0,0,0,.6)",
        lg2: "0 40px 80px -36px rgba(0,0,0,.72)",
        primary: "0 12px 26px -10px rgba(40,215,230,.55)",
      },
      keyframes: {
        bob: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
      animation: {
        bob: "bob 5.5s ease-in-out infinite",
        "bob-a": "bob 6s ease-in-out infinite",
        "bob-b": "bob 5s ease-in-out .4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
