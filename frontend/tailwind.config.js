/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0a2342", // deep blue
          light: "#19376d",
          dark: "#06172a",
        },
        accent: {
          DEFAULT: "#ffd700", // gold
          light: "#ffe066",
          dark: "#bfa100",
        },
        surface: {
          DEFAULT: "#181c23", // dark surface
          light: "#232a34",
          dark: "#101217",
        },
        text: {
          DEFAULT: "#f5f6fa", // light text
          muted: "#b0b7c3",
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};
