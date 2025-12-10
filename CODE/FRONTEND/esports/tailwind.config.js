/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TITAN ARENA Brand Colors
        'titan': {
          bg: '#0D0D0D',
          'bg-light': '#1A1A1A',
          'bg-card': '#141414',
          purple: '#8B5CF6',
          'purple-dark': '#6D28D9',
          'purple-light': '#A78BFA',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'heading': ['Rajdhani', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'aurora': 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 25%, #3B82F6 50%, #06B6D4 75%, #8B5CF6 100%)',
        'aurora-subtle': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
        'neon-glow': 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
        'hero-gradient': 'linear-gradient(180deg, #0D0D0D 0%, rgba(139, 92, 246, 0.1) 50%, #0D0D0D 100%)',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
        'neon-sm': '0 0 10px rgba(139, 92, 246, 0.4)',
        'neon-lg': '0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'aurora': 'aurora 10s ease infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.8), 0 0 60px rgba(139, 92, 246, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}