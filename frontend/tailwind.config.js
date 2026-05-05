/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        milk: {
          50:  "#f0f7ff",
          100: "#e0effe",
          200: "#baddfd",
          300: "#7ec3fb",
          400: "#3aa3f6",
          500: "#1085e8",
          600: "#0366c6",
          700: "#0452a0",
          800: "#084684",
          900: "#0d3c6e",
          950: "#092548",
        },
        cream: {
          50:  "#fefdf8",
          100: "#fdfaed",
          200: "#faf3d3",
          300: "#f6e8a7",
          400: "#f0d570",
          500: "#e8bc3e",
        },
        slate: {
          850: "#172033",
          950: "#0a0f1e",
        }
      },
      fontFamily: {
        display: ["'DM Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "slide-up":   "slideUp 0.4s ease-out",
        "fade-in":    "fadeIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":  "spin 3s linear infinite",
      },
      keyframes: {
        slideUp:  { "0%": { opacity: 0, transform: "translateY(16px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        fadeIn:   { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
      },
    }
  },
  plugins: []
}
