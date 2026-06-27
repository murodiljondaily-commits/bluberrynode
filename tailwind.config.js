/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      colors: {
        'berry-deep': '#3D1F6E',
        'berry-mid': '#7B5EA7',
        'berry-light': '#C9B8E8',
        'berry-glow': '#E8E0F5',
        'berry-dark': '#1A0A3D',
        'cream': '#F5F0E8',
        'leaf': '#5A8A5A',
        'leaf-light': '#E8F5E8',
      },
    },
  },
  plugins: [],
}
