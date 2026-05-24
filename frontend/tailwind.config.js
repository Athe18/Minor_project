/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2f5fa',
          100: '#e1e8f5',
          200: '#c5d5ed',
          300: '#9bb8e0',
          400: '#6a94d0',
          500: '#4872b6',
          600: '#375796',
          700: '#2e477c',
          800: '#293c66',
          900: '#253457',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(16, 24, 40, 0.05), 0 2px 8px -1px rgba(16, 24, 40, 0.04)',
        'premium-hover': '0 12px 32px -4px rgba(16, 24, 40, 0.08), 0 4px 12px -2px rgba(16, 24, 40, 0.06)',
      }
    },
  },
  plugins: [],
}
