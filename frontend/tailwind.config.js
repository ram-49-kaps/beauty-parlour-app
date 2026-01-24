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
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        }
      },
      fontFamily: {
        'playfair': ['"Playfair Display"', 'serif'],
        'poppins': ['"Poppins"', 'sans-serif'],
        'dancing': ['"Dancing Script"', 'cursive'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'beauty-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'rose-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
      },
      boxShadow: {
        'beauty': '0 10px 40px rgba(217, 70, 239, 0.3)',
        'rose': '0 10px 40px rgba(244, 63, 94, 0.3)',
      }
    },
  },
  plugins: [],
}