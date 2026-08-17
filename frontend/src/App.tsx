import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import Login from '@/pages/Login';

// 路由级代码分割：首屏只加载必要页面，其余按需加载
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Knowledge = lazy(() => import('@/pages/Knowledge'));
const Practice = lazy(() => import('@/pages/Practice'));
const Exam = lazy(() => import('@/pages/Exam'));
const WrongQuestions = lazy(() => import('@/pages/WrongQuestions'));
const Recitation = lazy(() => import('@/pages/Recitation'));
const AIPage = lazy(() => import('@/pages/AIPage'));
const Profile = lazy(() => import('@/pages/Profile'));
const Insights = lazy(() => import('@/pages/Insights'));
const Resources = lazy(() => import('@/pages/Resources'));

// 路由守卫：未登录跳转登录页
function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-gray-400">页面加载中…</div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
        <Route path="/learn" element={<Suspense fallback={<PageFallback />}><Knowledge /></Suspense>} />
        <Route path="/practice" element={<Suspense fallback={<PageFallback />}><Practice /></Suspense>} />
        <Route path="/exam" element={<Suspense fallback={<PageFallback />}><Exam /></Suspense>} />
        <Route path="/wrong" element={<Suspense fallback={<PageFallback />}><WrongQuestions /></Suspense>} />
        <Route path="/recitation" element={<Suspense fallback={<PageFallback />}><Recitation /></Suspense>} />
        <Route path="/ai" element={<Suspense fallback={<PageFallback />}><AIPage /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
        <Route path="/insights" element={<Suspense fallback={<PageFallback />}><Insights /></Suspense>} />
        <Route path="/resources" element={<Suspense fallback={<PageFallback />}><Resources /></Suspense>} />
      </Route>
    </Routes>
  );
}
