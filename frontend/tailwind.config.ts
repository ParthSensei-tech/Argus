import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        argus: {
          void: "#07030D",      // Deepest black-purple void
          black: "#0D0618",     // Main background black
          night: "#130A24",     // Surface container
          card: "#190E30",      // Card surface
          cardHover: "#221342", // Hover card
          border: "#2E1A52",    // Subtle purple border
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",       // Royal Gold Primary
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        purple: {
          850: "#1A0D30",
          950: "#0C0618",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 25px -5px rgba(245, 158, 11, 0.35)",
        "gold-sm": "0 0 10px rgba(245, 158, 11, 0.2)",
        "purple-glow": "0 0 30px -5px rgba(168, 85, 247, 0.25)",
      },
      animation: {
        "spin-slow": "spin 2s linear infinite",
        "pulse-gold": "pulseGold 2s infinite ease-in-out",
      },
      keyframes: {
        pulseGold: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
