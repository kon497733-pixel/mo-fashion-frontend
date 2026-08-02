/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D4AF37', // Premium Gold
          light: '#F3E5AB',
          dark: '#AA8000',
        },
        secondary: {
          DEFAULT: '#111111', // Premium Black
          light: '#222222',
          dark: '#000000',
        },
        background: '#0a0a0a',
        surface: '#1a1a1a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
        serif: ['Playfair Display', 'serif'], // Premium fashion font
      },
      container: {
        center: true,
        padding: '1rem',
      }
    },
  },
  plugins: [],
}