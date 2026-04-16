/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neko: {
          50:  '#fff8f0',
          100: '#ffeedd',
          200: '#ffd9b5',
          300: '#ffbd7d',
          400: '#ff9a42',
          500: '#f97316',
          600: '#ea6007',
          700: '#c44d08',
          800: '#9c3d0f',
          900: '#7d3310',
        },
        cream: {
          50:  '#fefdf9',
          100: '#fef9f0',
          200: '#fdf0dc',
          300: '#fbe3bf',
          400: '#f8cf94',
        },
        // Warm dark palette — keeps the cozy café vibe in dark mode
        bark: {
          50:  '#faf6f1',
          100: '#f0e8dd',
          200: '#ddd0bf',
          300: '#c9b69e',
          400: '#a8917a',
          500: '#8a7560',
          600: '#6e5c4a',
          700: '#4a3d30',
          800: '#352b21',
          900: '#261e16',
          950: '#1a140e',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans TC"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
