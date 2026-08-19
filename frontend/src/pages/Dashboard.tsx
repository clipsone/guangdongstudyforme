import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ClipboardList, Flame, Newspaper, Rocket, Target, XCircle, Bot as BotIcon } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { statisticsService } from '@/services/statisticsService';
import { studyTaskService } from '@/services/studyTaskService';
import { recitationService } from '@/services/recitationService';
import { wrongQuestionService } from '@/services/wrongQuestionService';
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

// 科目卡片配置
const SPRING_SUBJECTS = [
  { code: 'Y', name: '语文', icon: '📖', color: 'from-red-500 to-orange-500', path: '/practice' },
  { code: 'M', name: '数学', icon: '📐', color: 'from-blue-500 to-cyan-500', path: '/practice' },
  { code: 'E', name: '英语', icon: '🔤', color: 'from-green-500 to-emerald-500', path: '/practice' },
];

const UNDERGRAD_SUBJECTS = [
  { code: 'CET4', name: 'CET-4 四级', icon: '🎓', color: 'from-blue-500 to-indigo-500', path: '/practice' },
  { code: 'CET6', name: 'CET-6 六级', icon: '🏆', color: 'from-purple-500 to-pink-500', path: '/practice' },
  { code: 'IELTS', name: '雅思 IELTS', icon: '🌍', color: 'from-orange-500 to-yellow-500', path: '/practice' },
  { code: 'TOEFL', name: '托福 TOEFL', icon: '🇺🇸', color: 'from-red-500 to-rose-500', path: '/practice' },
  { code: 'LAW', name: '法律基础', icon: '⚖️', color: 'from-slate-500 to-gray-600', path: '/practice' },
  { code: 'UNIV', name: '大学通识课', icon: '📚', color: 'from-green-500 to-teal-500', path: '/practice' },
  { code: 'PAPER', name: '论文写作', icon: '✍️', color: 'from-amber-500 to-orange-500', path: '/practice' },
];

export default function Dashboard() {
  const { user, userId } = useUser();
  const isUndergrad = user?.examMode === 'undergraduate';
  const subjects = isUndergrad ? UNDERGRAD_SUBJECTS : SPRING_SUBJECTS;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [dueWrong, setDueWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, tasksRes, dueRes, _dueWrongRes] = await Promise.all([
        statisticsService.getDashboardStats(userId),
        studyTaskService.getStudyTasks(userId),
        recitationService.getTodayRecitation(userId),
        wrongQuestionService.getReviewDue().catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setTasks(tasksRes.data);
      setDueCount(dueRes.data.length);
      setDueWrong((_dueWrongRes?.data?.length) || 0);
      setDueWrong(dueRes.data.length);
    } catch (e: any) {
      setError(e?.error?.message || '无法连接后端');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const complete = async (id: string) => {
    try {
      const res = await studyTaskService.completeStudyTask(id);
      const badges = (res as any)?.newAchievements || [];
      if (badges.length > 0) setNewBadges(badges.map((b: any) => b.name));
    } catch { /* ignore */ }
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

  // 准备描述文案
  const springDesc = '依据《普通高中课程标准》，只考必修内容。数学新增复数/逻辑用语/百分位数，英语新增五选五。';
  const undergradDesc = isUndergrad ? `备考目标：${(user?.examTargets?.subjects || []).join('、') || '未设置'}` : '';

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* 顶部 banner */}
      <div className="card overflow-hidden">
        <div className="bauhaus-stripe"><span /><span /><span /></div>
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
                <span className="geo-red-square" /> {isUndergrad ? '本科模式' : '春考冲刺'}
              </div>
              <div className="mt-2">
                <span className="text-4xl font-black tabular-nums leading-none text-ink dark:text-white">
                  {isUndergrad ? '学习平台' : `${daysLeft}`}
                </span>
                {!isUndergrad && <span className="pb-1 text-2xl font-black text-primary"> 天</span>}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 border-2 border-ink bg-accent px-2 py-0.5 text-xs font-bold text-ink">
                {isUndergrad
                  ? `考试日期：${fmtDate(user?.examDate || '2027-06-30')}`
                  : `考试日期：${fmtDate(user?.examDate || '2027-01-10')} · 以官方公布为准`}
              </div>
              {isUndergrad && (user?.examTargets?.goalScore || 0) > 0 && (
                <div className="mt-1 text-xs text-gray-500">目标分数：{user?.examTargets?.goalScore}</div>
              )}
            </div>
            <div className="flex items-center gap-2 opacity-90">
              <span className="geo-yellow-circle !w-10 !h-10" />
              <span className="geo-blue-triangle !border-l-[20px] !border-r-[20px] !border-b-[34px]" />
              <span className="geo-red-square !w-10 !h-10" />
            </div>
            <div className="max-w-md border-2 border-ink bg-paper px-4 py-3 text-sm leading-relaxed dark:bg-gray-800">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-ink dark:text-white">
                <Flame size={14} className="text-primary" /> 今日语录
              </div>
              {quote}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t-2 border-ink bg-white px-4 py-2 text-xs dark:bg-[#1c1c1c]">
          <Newspaper size={14} className="shrink-0 text-primary" />
          <span className="text-gray-600 dark:text-gray-300">{isUndergrad ? undergradDesc : springDesc}</span>
        </div>
      </div>

      {/* 科目卡片 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subj) => (
          <Link
            key={subj.code}
            to={subj.path}
            className={`card overflow-hidden border-2 transition-all hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <div className={`h-1.5 bg-gradient-to-r ${subj.color}`} />
            <div className="p-4 flex items-center gap-3">
              <span className="text-3xl">{subj.icon}</span>
              <div>
                <div className="font-bold text-ink dark:text-white">{subj.name}</div>
                <div className="text-xs text-gray-500">点击进入练习</div>
              </div>
            </div>
          </Link>
        ))}
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
              <h2 className="mb-3 font-semibold">📊 掌握度</h2>
              {mastery.length > 0 ? (
                <>
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
                </>
              ) : (
                <div className="py-8 text-center text-sm text-gray-400">
                  暂无数据，完成练习后这里会显示掌握度
                </div>
              )}
            </div>
          </div>

          {/* 里程碑 */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">🏁 里程碑</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Milestone label="刷题总量" value={`${totalExercises} 次练习`} pct={Math.min(100, Math.round((totalExercises / 50) * 100))} />
              <Milestone label="待重练错题" value={`${wrongPending} 题`} pct={100} danger={wrongPending > 0} />
              <Milestone label="今日错题到期" value={`${dueWrong} 题`} pct={100} danger={dueWrong > 0} />
              <Milestone label="背诵待复习" value={`${dueCount} 项`} pct={100} danger={dueCount > 0} />
              <Milestone label="今日学习时长" value={studyMinutes > 0 ? `${studyHours}h ${studyMinRest}m` : '0 min'} pct={Math.min(100, Math.round((studyMinutes / 120) * 100))} />
              <Milestone label="已掌握考点" value={`${mastery.filter((m) => m.mastery >= 80).length}/${mastery.length || 3} 科`} pct={mastery.length ? Math.round((mastery.filter((m) => m.mastery >= 80).length / mastery.length) * 100) : 0} />
              <Milestone label="模考平均分" value={`${stats?.avgExamScore || 0} 分`} pct={isUndergrad ? Math.min(100, Math.round(((stats?.avgExamScore || 0) / (user?.examTargets?.goalScore || 550)) * 100)) : Math.min(100, Math.round(((stats?.avgExamScore || 0) / 150) * 100))} />
              <Milestone label="目标分数" value={`${user?.targetScore || 450} 分`} pct={0} />
              <Milestone label="离考试" value={`${daysLeft} 天`} pct={Math.max(0, Math.min(100, Math.round(((365 - daysLeft) / 365) * 100)))} />
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="card flex flex-wrap items-center gap-3 p-5">
            <Target size={22} className="text-accent" />
            <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
              今天的目标：完成 <b>20 道练习</b>、复习 <b>5 道错题</b>、背诵 <b>1 个篇目</b>。积少成多，坚持就是胜利！
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to="/practice" className="btn-accent">开始练习 <Rocket size={14} /></Link>
              <Link to="/exam" className="btn-outline text-sm"><ClipboardList size={14} /> 全真模考</Link>
              <Link to="/ai" className="btn-outline text-sm"><BotIcon size={14} /> AI 辅导</Link>
              <Link to="/wrong" className="btn-outline text-sm"><XCircle size={14} /> 错题本</Link>
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
