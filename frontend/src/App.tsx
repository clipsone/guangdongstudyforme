import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Knowledge from '@/pages/Knowledge';
import Practice from '@/pages/Practice';
import Exam from '@/pages/Exam';
import WrongQuestions from '@/pages/WrongQuestions';
import Recitation from '@/pages/Recitation';
import AIPage from '@/pages/AIPage';
import Profile from '@/pages/Profile';
import Insights from '@/pages/Insights';
import Resources from '@/pages/Resources';
import Login from '@/pages/Login';

// 路由守卫：未登录跳转登录页
function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/learn" element={<Knowledge />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/wrong" element={<WrongQuestions />} />
        <Route path="/recitation" element={<Recitation />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/resources" element={<Resources />} />
      </Route>
    </Routes>
  );
}
