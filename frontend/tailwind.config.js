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
        primary: {
          DEFAULT: '#16a34a', // 春考绿
          light: '#22c55e',
          dark: '#15803d',
        },
        accent: {
          DEFAULT: '#f97316', // 橙色
          light: '#fb923c',
          dark: '#ea580c',
        },
        error: {
          DEFAULT: '#ef4444', // 错误红
          light: '#f87171',
          dark: '#dc2626',
        },
        info: {
          DEFAULT: '#3b82f6', // 信息蓝
          light: '#60a5fa',
          dark: '#2563eb',
        },
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
      },
      fontFamily: {
        sans: ['SF Pro', 'PingFang SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}