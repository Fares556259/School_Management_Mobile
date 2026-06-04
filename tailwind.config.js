// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0072e6",
          shadow: "#0055b3",
          secondary: "#006d4a",
          tertiary: "#865400",
          error: "#c0392b",
          "error-bg": "#fde8e8",
        },
        surface: {
          background: "#ffffff",
          low: "#f1f5f9",
          lowest: "#ffffff",
          high: "#e2e8f0",
          highest: "#dbe4e7",
        },
        text: {
          primary: "#1e293b",
          secondary: "#475569",
          muted: "#64748b",
        },
        status: {
          "present": "#16a34a",
          "present-bg": "#dcfce7",
          "present-border": "#86efac",
          "absent": "#dc2626",
          "absent-bg": "#fee2e2",
          "absent-border": "#fca5a5",
          "late": "#d97706",
          "late-bg": "#fef3c7",
          "late-border": "#fcd34d",
          "pending": "#64748b",
          "pending-bg": "#f1f5f9",
          "pending-border": "#cbd5e1",
        },
        ink: "#1e293b",
        "ink-muted": "#64748b",
        canvas: "#ffffff",
        streak: "#f59e0b",
        duo: {
          border: "#e2e8f0",
        }
      },
      fontFamily: {
        manrope: ["Manrope"],
        jakarta: ["Plus Jakarta Sans"],
      },
      borderWidth: {
        "2.5": "2.5px",
      }
    },
  },
  plugins: [],
};
