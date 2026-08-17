import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, BookOpen, PenTool, ClipboardList, XCircle, FileText, Bot, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/learn', icon: BookOpen, label: '学习' },
    { path: '/practice', icon: PenTool, label: '练习' },
    { path: '/exam', icon: ClipboardList, label: '模考' },
    { path: '/wrong', icon: XCircle, label: '错题' },
    { path: '/recitation', icon: FileText, label: '背诵' },
    { path: '/ai', icon: Bot, label: 'AI' },
    { path: '/profile', icon: User, label: '我的' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-primary">2027春考·精准冲刺</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端底部导航 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-50">
        <div className="flex justify-around py-1.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-1 py-1 ${
                location.pathname === item.path
                  ? 'text-primary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* 桌面端侧边栏 */}
      <div className="flex">
        <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 min-h-screen border-r dark:border-gray-700 fixed left-0 top-16">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 md:ml-64 pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};