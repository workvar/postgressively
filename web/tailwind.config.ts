import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-hover": "var(--surface-hover)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-fg": "var(--accent-fg)",
        brand: "var(--brand)",
        "brand-hover": "var(--brand-hover)",
        "brand-soft": "var(--brand-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
      },
      borderRadius: { lg: "8px", xl: "10px", "2xl": "14px", pill: "980px" },
      fontSize: {
        title: ["24px", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "-0.015em" }],
        subtitle: ["15px", { lineHeight: "1.35", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.5" }],
        small: ["13px", { lineHeight: "1.45" }],
        caption: ["12px", { lineHeight: "1.4" }],
        micro: ["11px", { lineHeight: "1.35" }],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        pop: "var(--shadow-pop)",
      },
      transitionTimingFunction: { apple: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        pulseSoft: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.82", transform: "scale(0.97)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        waitRing: {
          "0%": { transform: "scale(0.92)", opacity: "0.55" },
          "70%": { transform: "scale(1.12)", opacity: "0" },
          "100%": { transform: "scale(1.12)", opacity: "0" },
        },
        progressShimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.28s cubic-bezier(0.25, 0.1, 0.25, 1) both",
        pulseSoft: "pulseSoft 1.6s cubic-bezier(0.25, 0.1, 0.25, 1) infinite",
        pulseDot: "pulseDot 1s cubic-bezier(0.25, 0.1, 0.25, 1) infinite",
        waitRing: "waitRing 1.4s cubic-bezier(0.25, 0.1, 0.25, 1) infinite",
        progressShimmer: "progressShimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
