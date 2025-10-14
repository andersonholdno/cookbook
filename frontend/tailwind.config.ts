import type { Config } from 'tailwindcss'

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F9E7A9',
        tomato: '#F87171',
        milk: '#FFFBF2',
        coffee: '#6B4F3B',
      }
    },
  },
  plugins: [],
} satisfies Config




