/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'xmas-gold': '#fbbf24', // amber-400
        'xmas-red': '#ef4444',  // red-500
        'xmas-red_dark': '#b91c1c', // red-700
        'xmas-green': '#22c55e', // green-500
      }
    },
  },
  plugins: [],
};