/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1a',
        surface: '#111827',
        'surface-light': '#1f2937',
        primary: '#00d4aa',
        secondary: '#9ca3af',
        border: '#374151',
        danger: '#ef4444',
        success: '#22c55e',
      },
    },
  },
  plugins: [],
};
