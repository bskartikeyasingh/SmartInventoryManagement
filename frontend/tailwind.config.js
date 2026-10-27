/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F1F3F5",
        surface: "#FFFFFF",
        muted: "#F7F7F8",
        border: "#E7E8EA",
        charcoal: {
          DEFAULT: "#242226",
          light: "#343236",
          dark: "#181719"
        },
        vermilion: {
          DEFAULT: "#FF3D12",
          hover: "#E5330B",
          light: "#FFF0EB",
          muted: "rgba(255, 61, 18, 0.12)"
        },
        secondary: "#77777D"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'control': '10px'
      }
    },
  },
  plugins: [],
}
