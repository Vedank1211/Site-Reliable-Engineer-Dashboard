/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: "#0a0b0f",
          900: "#0f1117",
          800: "#161922",
          700: "#1e2230",
        },
        neon: {
          green: "#22ff88",
          dim: "#0d9f5a",
        },
        accent: {
          purple: "#8b5cf6",
          blue: "#3b82f6",
        },
        critical: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 8px rgba(34, 255, 136, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(34, 255, 136, 0.6)" },
        },
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
