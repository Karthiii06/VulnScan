/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Severity colors
        critical: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
          dark: '#991b1b'
        },
        high: {
          DEFAULT: '#ea580c',
          light: '#ffedd5',
          dark: '#9a3412'
        },
        medium: {
          DEFAULT: '#ca8a04',
          light: '#fef3c7',
          dark: '#854d0e'
        },
        low: {
          DEFAULT: '#2563eb',
          light: '#dbeafe',
          dark: '#1e40af'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'scan-pulse': 'scanPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        scanPulse: {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 }
        }
      }
    },
  },
  plugins: [],
}