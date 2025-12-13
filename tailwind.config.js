/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 토스 스타일 컬러
        'toss-blue': '#0064FF',
        'toss-black': '#191F28',
        'toss-gray': {
          50: '#F4F6F8',
          100: '#E5E8EB',
          200: '#C9CDD2',
          300: '#9EA4AA',
          400: '#72787F',
          500: '#4E5968',
          600: '#333D4B',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

