/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bison: {
          brown: "#512615",
          "brown-light": "#6B3410",
          "brown-dark": "#3A1A0D",
          gold: "#F1BE48",
          "gold-dark": "#D9A832",
          cream: "#FBF7F0",
          surface: "#FFFFFF",
          border: "#E5D5BC",
          text: "#3A2718",
          "text-muted": "#6B5748",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui"],
        heading: ["Playfair Display", "ui-serif"],
      },
    },
  },
  plugins: [],
};
