import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        panel: "hsl(var(--panel))",
        "panel-2": "hsl(var(--panel-2))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        ink: "hsl(var(--ink))",
        "ink-dim": "hsl(var(--ink-dim))",
        "ink-faint": "hsl(var(--ink-faint))",
        accent: "hsl(var(--accent))",
        "accent-dim": "hsl(var(--accent-dim))",
        ok: "hsl(var(--ok))",
        warn: "hsl(var(--warn))",
        err: "hsl(var(--err))",
        info: "hsl(var(--info))",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        flowDash: {
          to: { strokeDashoffset: "-24" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        flowDash: "flowDash 1s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
