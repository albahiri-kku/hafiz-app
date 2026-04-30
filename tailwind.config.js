/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        ui: ['"Readex Pro"', '"Noto Sans Arabic"', 'sans-serif'],
        display: ['"Reem Kufi"', '"Noto Sans Arabic"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        royal: {
          50:  '#f1f8f4',
          100: '#dcecdf',
          200: '#bbd9c2',
          300: '#8dbe9b',
          400: '#5e9d72',
          500: '#3f8055',
          600: '#2d6541',
          700: '#235034',
          800: '#1c402a',
          900: '#163322',
          950: '#0a1f14',
        },
        gold: {
          50:  '#fbf8ec',
          100: '#f6efce',
          200: '#ecdc9c',
          300: '#dec362',
          400: '#cfac3b',
          500: '#b8932a',
          600: '#947123',
          700: '#735622',
          800: '#5d4622',
          900: '#4d3a22',
        },
        sand: {
          50:  '#faf7f1',
          100: '#f3ecdd',
          200: '#e6d6b4',
          300: '#d6bb83',
        },
        ink: {
          900: '#0d1410',
          800: '#1a2620',
          700: '#2a3a31',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(13,20,16,0.04), 0 4px 16px rgba(13,20,16,0.06)',
        ring: '0 0 0 1px rgba(35,80,52,0.10), 0 8px 24px rgba(13,20,16,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
