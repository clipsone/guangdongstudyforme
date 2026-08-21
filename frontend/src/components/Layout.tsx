import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, BookOpen, PenTool, ClipboardList, XCircle, FileText, Bot, User, Sun, Moon, Lock, Zap, Target } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/useUser';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';
  const isUndergrad = user?.examMode === 'undergraduate';

  const springNavItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/learn', icon: BookOpen, label: '学习' },
    { path: '/practice', icon: PenTool, label: '练习' },
    { path: '/micro-learn', icon: Zap, label: '微学习' },
    { path: '/exam', icon: ClipboardList, label: '模考' },
    { path: '/wrong', icon: XCircle, label: '错题' },
    { path: '/recitation', icon: FileText, label: '背诵' },
    { path: '/ai', icon: Bot, label: 'AI' },
    { path: '/profile', icon: User, label: '我的' },
  ];
  const universityNavItems = [
    { path: '/', icon: Home, label: '工作台' },
    { path: '/learn', icon: BookOpen, label: '课程' },
    { path: '/practice', icon: PenTool, label: '练习' },
    { path: '/resources', icon: FileText, label: '资料' },
    { path: '/ai', icon: Bot, label: 'AI 助手' },
    { path: '/insights', icon: Target, label: '学习分析' },
    { path: '/profile', icon: User, label: '我的' },
  ];
  const navItems = isUndergrad ? universityNavItems : springNavItems;
  const mobileNavItems = navItems.filter((item) => ['/','/learn','/practice','/ai','/profile'].includes(item.path));

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-paper dark:bg-[#111111] transition-colors">
      {/* 顶栏：白色 + 底部三色条（包豪斯经典配色） */}
      <nav className={isUndergrad ? 'sticky top-0 z-50 border-b-2 border-indigo-300 bg-white/95 dark:border-indigo-800 dark:bg-slate-950/95' : 'sticky top-0 z-50 border-b-2 border-ink bg-white dark:border-gray-500 dark:bg-[#1c1c1c]'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                {/* 包豪斯几何 logo：红方+黄圆+蓝三角 */}
                <span className="relative flex items-center">
                  <span className="geo-red-square" />
                  <span className="geo-yellow-circle -ml-2" />
                  <span className="geo-blue-triangle -ml-1.5" />
                </span>
                <span className="text-xl font-black tracking-tight text-ink dark:text-white">
                  {user?.examMode === 'undergraduate' ? '大学学习助手' : '春考精准冲刺'}<span className="text-primary">·</span>高效备考
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 border-2 border-ink bg-ink px-2.5 py-0.5 text-xs font-bold text-white hover:bg-primary hover:border-primary transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> 管理后台
                </Link>
              )}
              <span className="hidden sm:inline-flex items-center gap-1.5 border-2 border-ink bg-accent px-2 py-0.5 text-xs font-bold text-ink">
                 <span className="geo-blue-triangle scale-50" /> {user?.examMode === 'undergraduate' ? '大学学习进度' : '450 分目标'}
              </span>
              <button
                onClick={toggleTheme}
                className="border-2 border-ink p-2 hover:bg-ink hover:text-white dark:hover:bg-white dark:hover:text-ink transition-colors"
                aria-label="切换主题"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {/* 三色分割条 */}
        <div className={isUndergrad ? 'university-stripe' : 'bauhaus-stripe'}>
          <span /><span /><span />
        </div>
      </nav>

      {/* 移动端底部导航 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-ink bg-white dark:border-gray-500 dark:bg-[#1c1c1c]">
        <div className="flex justify-around py-1">
          {mobileNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-1 py-1.5 ${
                isActive(item.path) ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-bold">{item.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex flex-col items-center px-1 py-1.5 ${isActive('/admin') ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}
            >
              <Lock className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-bold">管理</span>
            </Link>
          )}
        </div>
      </nav>

      {/* 桌面端侧边栏：包豪斯几何色块激活态 */}
      <div className="flex">
        <aside className="hidden md:block w-64 border-r-2 border-ink bg-white dark:border-gray-500 dark:bg-[#1c1c1c] min-h-screen fixed left-0 top-[68px]">
          <nav className="p-3 space-y-1.5">
            {navItems.map((item, idx) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 border-2 font-bold transition-all ${
                  isActive(item.path)
                    ? 'border-ink bg-ink text-white'
                    : 'border-transparent text-gray-700 hover:border-ink hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {/* 每项前置几何色点：红黄蓝循环 */}
                <span
                  className={`inline-block h-2.5 w-2.5 ${
                    idx % 3 === 0 ? 'bg-ink' : idx % 3 === 1 ? 'bg-primary' : 'bg-gray-400'
                  } ${isActive(item.path) ? 'rounded-full' : ''}`}
                />
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center space-x-3 px-4 py-3 border-2 font-bold transition-all ${
                  isActive('/admin')
                    ? 'border-ink bg-ink text-white'
                    : 'border-transparent text-gray-700 hover:border-ink hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <span className="inline-block h-2.5 w-2.5 bg-ink" />
                <Lock className="w-5 h-5" />
                <span>管理后台</span>
              </Link>
            )}
            <div className="mt-6 border-2 border-ink bg-accent p-3">
              <div className="text-xs font-bold text-ink">{user?.examMode === 'undergraduate' ? '本学期学习任务' : '距离 2027 春考'}</div>
              <div className="text-lg font-black text-ink">{user?.examMode === 'undergraduate' ? '坚持 · 积累 · 进步' : '坚持 · 精准 · 冲刺'}</div>
            </div>
          </nav>
        </aside>

        {/* 主内容区域 */}
        <main className={isUndergrad ? 'flex-1 md:ml-64 pb-24 md:pb-8 university-shell' : 'flex-1 md:ml-64 pb-24 md:pb-8'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
