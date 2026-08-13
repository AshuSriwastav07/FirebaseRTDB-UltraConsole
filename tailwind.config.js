/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        firebase: {
          dark: '#121820',
          panel: '#1a212d',
          card: '#242c37',
          hover: '#2a3443',
          border: '#2e3a4e',
          amber: '#ffca28',
          yellow: '#ffa000',
          blue: '#03a9f4',
          subtleBlue: '#1e3a5f',
          red: '#f44336',
          green: '#4caf50',
          purple: '#ab47bc',
          gray: '#78909c'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
