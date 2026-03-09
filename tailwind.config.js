/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          blue:  '#1A56DB',
          cyan:  '#0891B2',
          navy:  '#0F2057',
          dark:  '#050810',
          card:  'rgba(255,255,255,0.04)',
        },
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};
