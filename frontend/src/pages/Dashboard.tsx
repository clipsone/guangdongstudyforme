import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Circle, ClipboardList, Flame, Newspaper, Rocket, Target } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { statisticsService } from '@/services/statisticsService';
import { studyTaskService } from '@/services/studyTaskService';
import { recitationService } from '@/services/recitationService';
import { getQuoteOfDay } from '@/data/quotes';
import { daysUntil, fmtDate } from '@/utils/date';
import { DonutChart } from '@/components/Charts';
import type { DashboardStats, StudyTask } from '@/types';

const TYPE_LABEL: Record<string, string> = {
  exercise: '练习',
  recitation: '背诵',
  exam: '模考',
  review: '错题',
  knowledge: '学习',
};

export default function Dashboard() {
  const { user, userId } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, tasksRes, dueRes] = await Promise.all([
        statisticsService.getDashboardStats(userId),
        studyTaskService.getStudyTasks(userId),
        recitationService.getTodayRecitation(userId),
      ]);
      setStats(statsRes.data);
      setTasks(tasksRes.data);
      setDueCount(dueRes.data.length);
    } catch (e: any) {
      setError(e?.error?.message || '无法连接后端');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const complete = async (id: string) => {
    try {
      const res = await studyTaskService.completeStudyTask(id);
      const badges = (res as any)?.newAchievements || [];
      if (badges.length > 0) setNewBadges(badges.map((b: any) => b.name));
    } catch {
      /* ignore */
    }
    load();
  };

  const daysLeft = daysUntil(user?.examDate);
  const doneCount = tasks.filter((t) => t.completed).length;
  const quote = getQuoteOfDay();
  const mastery = stats?.subjectStats || [];
  const totalExercises = stats?.totalExercises || 0;
  const wrongPending = stats?.wrongQuestionCount || 0;
  const studyMinutes = Math.round((stats?.todayStudySeconds || 0) / 60);
  const studyHours = Math.floor(studyMinutes / 60);
  const studyMinRest = studyMinutes % 60;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* 顶部：倒计时 + 语录 */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm opacity-80">距 2027 年广东春季高考</div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-5xl font-black tabular-nums">{daysLeft}</span>
                <span className="pb-1 text-xl font-semibold">天</span>
              </div>
              <div className="mt-1 text-xs opacity-80">
                考试日期：{fmtDate(user?.examDate || '2027-01-10')}（⚠️ 以官方公布为准）
              </div>
            </div>
            <div className="max-w-md rounded-xl bg-white/15 px-4 py-3 text-sm leading-relaxed">
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-90">
                <Flame size={14} /> 今日语录
              </div>
              {quote}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 text-xs dark:border-gray-700">
          <Newspaper size={14} className="shrink-0 text-accent" />
          <span className="text-gray-600 dark:text-gray-300">
            2027 春考依据《普通高中课程标准（2017 年版 2020 年修订）》，只考必修内容。
            数学新增复数/逻辑用语/百分位数，英语新增「五选五」阅读还原。
          </span>
        </div>
      </div>

      {newBadges.length > 0 && (
        <div className="card border-accent/40 bg-accent/5 p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-accent">🏅 新成就解锁</div>
          <div className="flex flex-wrap gap-2">
            {newBadges.map((name) => (
              <span key={name} className="chip border border-accent/50 bg-accent/10 text-accent">{name}</span>
            ))}
          </div>
          <button className="mt-2 text-xs text-gray-400 underline" onClick={() => setNewBadges([])}>知道了</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中…</div>
      ) : error ? (
        <div className="card p-10 text-center">
          <div className="mb-3 text-red-500">⚠️ 无法连接后端：{error}</div>
          <div className="text-sm text-gray-500">
            请确认后端已启动：<code className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">cd 2027spring-exam/backend &amp;&amp; npm run dev</code>
          </div>
        </div>
      ) : (
        <>
          {/* 今日任务 + 掌握度 */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">📋 今日任务（{doneCount}/{tasks.length}）</h2>
                <span className="text-xs text-gray-400">每日 0 点自动生成</span>
              </div>
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">今天暂无任务，去练习页刷几道题吧～</div>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700">
                      {t.completed ? (
                        <CheckCircle2 size={18} className="shrink-0 text-primary" />
                      ) : (
                        <button onClick={() => complete(t.id)} title="点击打卡" className="shrink-0">
                          <Circle size={18} className="text-gray-300 hover:text-primary dark:text-gray-600" />
                        </button>
                      )}
                      <div className={`flex-1 text-sm ${t.completed ? 'text-gray-400 line-through' : ''}`}>
                        {t.title}
                        {t.description && <span className="ml-2 text-xs text-gray-400">{t.description}</span>}
                      </div>
                      <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        {TYPE_LABEL[t.type] || t.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/practice" className="btn-primary mt-4 w-full">
                <Rocket size={16} /> 一键开始学习
              </Link>
            </div>

            <div className="card p-5">
              <h2 className="mb-3 font-semibold">📊 三科掌握度</h2>
              <DonutChart data={mastery.map((m) => ({ name: m.name, value: m.mastery }))} />
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {mastery.map((m) => (
                  <div key={m.code} className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
                    <div className="text-sm font-semibold text-primary">{m.mastery}%</div>
                    <div className="text-xs text-gray-500">{m.name}</div>
                  </div>
                ))}
              </div>
              <Link to="/profile" className="mt-3 block text-center text-xs text-info hover:underline">查看雷达图 →</Link>
            </div>
          </div>

          {/* 里程碑 */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">🏁 里程碑</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Milestone label="刷题总量" value={`${totalExercises} 次练习`} pct={Math.min(100, Math.round((totalExercises / 50) * 100))} />
              <Milestone label="待重练错题" value={`${wrongPending} 题`} pct={100} danger={wrongPending > 0} />
              <Milestone label="背诵待复习" value={`${dueCount} 项`} pct={100} danger={dueCount > 0} />
              <Milestone label="今日学习时长" value={studyMinutes > 0 ? `${studyHours}h ${studyMinRest}m` : '0 min'} pct={Math.min(100, Math.round((studyMinutes / 120) * 100))} />
              <Milestone label="已掌握考点" value={`${mastery.filter((m) => m.mastery >= 80).length}/3 科`} pct={Math.round((mastery.filter((m) => m.mastery >= 80).length / 3) * 100)} />
              <Milestone label="模考平均分" value={`${stats?.avgExamScore || 0} 分`} pct={Math.min(100, Math.round(((stats?.avgExamScore || 0) / 150) * 100))} />
              <Milestone label="目标分数" value={`${user?.targetScore || 450} 分`} pct={0} />
              <Milestone label="离考试" value={`${daysLeft} 天`} pct={Math.max(0, Math.min(100, Math.round(((365 - daysLeft) / 365) * 100)))} />
            </div>
          </div>

          {/* 今日目标横幅 */}
          <div className="card flex flex-wrap items-center gap-3 p-5">
            <Target size={22} className="text-accent" />
            <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
              今天的目标：完成 <b>20 道练习</b>、复习 <b>5 道错题</b>、背诵 <b>1 个篇目</b>。积少成多，坚持就是胜利！
            </div>
            <div className="flex gap-2">
              <Link to="/practice" className="btn-accent">开始练习 <Rocket size={14} /></Link>
              <Link to="/exam" className="btn-outline text-sm"><ClipboardList size={14} /> 全真模考</Link>
              <Link to="/ai" className="btn-outline text-sm"><Bot size={14} /> AI 辅导</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Milestone({ label, value, pct, danger }: { label: string; value: string; pct: number; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className={`font-semibold ${danger ? 'text-error' : 'text-primary'}`}>{value}</span>
      </div>
      <div className="progress-bar">
        <div className={`h-full rounded-full ${danger ? 'bg-error' : 'bg-primary'}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
