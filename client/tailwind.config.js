/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      display: ["poppins", "sans-serif"],
    },
    extend: {
      colors: {
        primary: "#05b6D2",
        secondary: "#EF863E",
      },
    },
  },
  plugins: [],
};
