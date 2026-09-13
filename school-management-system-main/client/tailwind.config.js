import colors from 'tailwindcss/colors';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      colors: {
        primary: '#1E3A8A',    // Deep Blue
        secondary: '#3B82F6',  // Slate Blue
        accent: '#14B8A6',     // Soft Teal
        surface: '#F8FAFC',    // Off-white
        slate: {
          ...colors.slate,
          DEFAULT: '#0F172A',  // Dark Slate
        },
        muted: '#64748B',      // Gray
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
