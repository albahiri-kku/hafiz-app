/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        quran: ['"Amiri Quran"', '"Amiri"', 'serif'],
        ui: ['"Noto Sans Arabic"', 'sans-serif'],
      },
      colors: {
        emerald: {
          950: '#022c22',
        },
        parchment: {
          50:  '#fdf8f0',
          100: '#faf0dc',
          200: '#f5e0b5',
        },
      },
      animation: {
        'pulse-mic': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
