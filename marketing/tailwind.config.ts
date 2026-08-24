import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
      },
      borderRadius: {
        lg: "10px",
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
        pill: "980px",
      },
      fontSize: {
        display: ["4.5rem", { lineHeight: "1.02", letterSpacing: "-0.04em", fontWeight: "600" }],
        hero: ["3.25rem", { lineHeight: "1.06", letterSpacing: "-0.035em", fontWeight: "600" }],
        section: ["2.125rem", { lineHeight: "1.12", letterSpacing: "-0.025em", fontWeight: "600" }],
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        panel: "var(--shadow-panel)",
        float: "var(--shadow-float)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
