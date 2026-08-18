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
        // 包豪斯：三原色 + 黑 + 纸白
        primary: {
          DEFAULT: '#E30613', // 包豪斯红（主操作）
          light: '#FF3B30',
          dark: '#B00511',
        },
        accent: {
          DEFAULT: '#F4B400', // 包豪斯黄（强调/成就）
          light: '#FFD60A',
          dark: '#D19A00',
        },
        info: {
          DEFAULT: '#0F52BA', // 包豪斯蓝（信息/链接）
          light: '#2E6FD8',
          dark: '#0B3D8C',
        },
        error: {
          DEFAULT: '#E30613',
          light: '#FF3B30',
          dark: '#B00511',
        },
        ink: '#111111', // 包豪斯黑
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
        'bauhaus-yellow': '4px 4px 0 0 #F4B400',
      },
    },
  },
  plugins: [],
}
