/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { nucare: { 50: "#eef8f1", 100: "#d9efdf", 600: "#16834d", 700: "#145b3c", 800: "#104a32" } } } },
  plugins: []
};
