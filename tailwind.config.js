/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'stone-dark': '#2a2010',
        'stone-mid': '#2e2a25',
        'stone-light': '#3d3830',
        'stone-mortar': '#0e0c09',
        gold: '#c9a060',
        'gold-muted': '#7a6a4a',
        'gold-faint': '#5a5040',
        'gold-dim': '#4a4030',
        'gold-bright': '#f0d060',
        'purple-ai': '#c8a8f0',
        vine: '#2d4a1e',
        stone: '#3a3020',
        'bg-dark': '#0a0805',
        'bg-panel': '#1c160f',
      },
      fontSize: {
        micro: ['9px', { lineHeight: '1.4' }],
        label: ['11px', { lineHeight: '1.5' }],
        body: ['13px', { lineHeight: '1.6' }],
        heading: ['16px', { lineHeight: '1.4' }],
      },
      fontFamily: {
        cinzel: ['"Cinzel"', 'Georgia', 'serif'],
        'cinzel-deco': ['"Cinzel Decorative"', 'Georgia', 'serif'],
        body: ['Georgia', 'serif'],
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '1' },
        },
        orbPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(140,60,255,0.6)' },
          '50%': { boxShadow: '0 0 20px rgba(180,100,255,1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(110%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
      animation: {
        flicker: 'flicker 2s ease-in-out infinite alternate',
        orbPulse: 'orbPulse 2.5s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite linear',
        slideInRight: 'slideInRight 0.3s ease-out',
        sway: 'sway 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
