/** @type {import('tailwindcss').Config} */
export default {
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
