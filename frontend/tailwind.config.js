/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    colors: {
      primary: "#0a2342", // deep blue
      "primary-light": "#19376d",
      "primary-dark": "#06172a",
      accent: "#ffd700", // gold
      "accent-light": "#ffe066",
      "accent-dark": "#bfa100",
      surface: "#181c23", // dark surface
      "surface-light": "#232a34",
      "surface-dark": "#101217",
      text: "#f5f6fa", // light text
      "text-muted": "#b0b7c3",
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};
