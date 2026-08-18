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
        // 黑白基底 + 深蓝点缀（包豪斯几何，去红黄蓝）
        primary: {
          DEFAULT: '#1D4ED8', // 深蓝（主操作/激活）
          light: '#3B82F6',
          dark: '#1E40AF',
        },
        accent: {
          DEFAULT: '#2563EB', // 亮蓝（强调）
          light: '#60A5FA',
          dark: '#1D4ED8',
        },
        info: {
          DEFAULT: '#3B82F6', // 信息蓝
          light: '#93C5FD',
          dark: '#1E40AF',
        },
        error: {
          DEFAULT: '#DC2626', // 语义红（仅错误提示，小面积）
          light: '#EF4444',
          dark: '#B91C1C',
        },
        ink: '#111111', // 黑
        paper: '#FAFAF7', // 纸白背景
      },
      borderRadius: {
        // 包豪斯几何：去圆角化
        'none': '0px',
        'sm': '0px',
        DEFAULT: '0px',
        'md': '2px',
        'lg': '4px',
        'xl': '8px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['"Arial Black"', '"Helvetica Neue"', 'PingFang SC', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['"Arial Black"', '"Helvetica Neue"', 'PingFang SC', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // 包豪斯硬阴影（海报感）
        'bauhaus': '4px 4px 0 0 #111111',
        'bauhaus-sm': '3px 3px 0 0 #111111',
        'bauhaus-blue': '4px 4px 0 0 #1D4ED8',
      },
    },
  },
  plugins: [],
}
