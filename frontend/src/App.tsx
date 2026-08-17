import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
