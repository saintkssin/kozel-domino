/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { fredoka: ['Fredoka', 'sans-serif'] },
      colors: {
        felt:  { DEFAULT: '#1a4d2e', dark: '#0f3d24', light: '#22603a', border: '#0a2d1a' },
        teamA: { DEFAULT: '#f5a623', light: '#ffd580', dark: '#b87200' },
        teamB: { DEFAULT: '#7c6af5', light: '#b8b0ff', dark: '#4a3fc7' },
        danger: '#e84040',
        tile:  { bg: '#f5f0e8', border: '#1a1a1a', dot: '#1a1a1a', back: '#2d6a47' },
        ui:    { bg: '#0f1e14', card: '#162b1d', border: '#1e3d28' },
      },
      boxShadow: {
        tile:      '2px 4px 8px rgba(0,0,0,0.5)',
        'tile-lg': '3px 6px 16px rgba(0,0,0,0.6)',
        glow:      '0 0 12px 3px currentColor',
      },
      keyframes: {
        'score-pop': {
          '0%':   { transform: 'translateY(0) scale(0.5)', opacity: '0' },
          '50%':  { transform: 'translateY(-30px) scale(1.4)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(1)', opacity: '0' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-5px)' },
          '40%':     { transform: 'translateX(5px)' },
          '60%':     { transform: 'translateX(-3px)' },
          '80%':     { transform: 'translateX(3px)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 6px 2px currentColor' },
          '50%':     { boxShadow: '0 0 18px 5px currentColor' },
        },
        'tile-drop': {
          '0%':   { transform: 'translateY(-16px) scale(0.9)', opacity: '0' },
          '70%':  { transform: 'translateY(3px) scale(1.02)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
      animation: {
        'score-pop':  'score-pop 1.2s ease-out forwards',
        shake:        'shake 0.4s ease-in-out',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'tile-drop':  'tile-drop 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
