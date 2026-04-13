// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0055d4",
          secondary: "#006d4a",
          tertiary: "#865400",
          error: "#9f403d",
        },
        surface: {
          background: "#f8f9fa",
          low: "#f1f4f6",
          lowest: "#ffffff",
          high: "#e2e9ec",
          highest: "#dbe4e7",
        },
        text: {
          primary: "#2b3437",
          secondary: "#586064",
          muted: "#737c7f",
        }
      },
      fontFamily: {
        manrope: ["Manrope"],
        jakarta: ["Plus Jakarta Sans"],
      }
    },
  },
  plugins: [],
};
