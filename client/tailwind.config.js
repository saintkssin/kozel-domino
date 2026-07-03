/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { fredoka: ['Fredoka', 'sans-serif'] },
      colors: {
        bg:    { DEFAULT: '#0f0e17', 2: '#1a1828', 3: '#232136' },
        teamA: { DEFAULT: '#f5a623', light: '#ffd580', dark: '#b87200' },
        teamB: { DEFAULT: '#7c6af5', light: '#b8b0ff', dark: '#4a3fc7' },
        danger: '#e84040',
        tile:  { bg: '#2a2740', border: '#4a4670', dot: '#f0ede8' },
      },
      boxShadow: {
        glow: '0 0 16px 4px currentColor',
        tile: '0 4px 16px rgba(0,0,0,0.6)',
        'tile-hover': '0 8px 24px rgba(0,0,0,0.8)',
      },
      keyframes: {
        'score-pop': {
          '0%':   { transform: 'scale(0.5)', opacity: '0' },
          '60%':  { transform: 'scale(1.3)', opacity: '1' },
          '100%': { transform: 'scale(1)',   opacity: '0' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-6px)' },
          '40%':     { transform: 'translateX(6px)' },
          '60%':     { transform: 'translateX(-4px)' },
          '80%':     { transform: 'translateX(4px)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 8px 2px currentColor' },
          '50%':     { boxShadow: '0 0 20px 6px currentColor' },
        },
      },
      animation: {
        'score-pop':  'score-pop 1.2s ease-out forwards',
        shake:        'shake 0.4s ease-in-out',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
