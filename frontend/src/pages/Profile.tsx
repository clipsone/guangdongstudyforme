import { useEffect, useState } from 'react';
import { BarChart3, BookMarked, CalendarDays, CheckCircle2, Download, Lock, Save, Target, TrendingUp, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';
import { statisticsService } from '@/services/statisticsService';
import { exportService } from '@/services/exportService';
import { exerciseService } from '@/services/exerciseService';
import { achievementService } from '@/services/achievementService';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { LineTrendChart, RadarChart } from '@/components/Charts';
import { fmtDate } from '@/utils/date';
import type { Achievement, ExerciseRecord } from '@/types';

export default function Profile() {
  const { user, loading: userLoading } = useUser();
  const [progress, setProgress] = useState<Array<{ date: string; accuracy: number }>>([]);
  const [radar, setRadar] = useState<Array<{ subject: string; mastery: number; accuracy: number; duration: number; stability?: number; pace?: number }>>([]);
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetScore, setTargetScore] = useState('');
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const changePwd = async () => {
    setPwdError(false);
    setPwdMsg('');
    if (!oldPassword || !newPassword) {
      setPwdError(true);
      setPwdMsg('请填写旧密码和新密码');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError(true);
      setPwdMsg('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(true);
      setPwdMsg('两次输入的新密码不一致');
      return;
    }
    setPwdSaving(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      setPwdMsg('✅ 密码已修改');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPwdError(true);
      setPwdMsg(e?.error?.message || '修改失败');
    } finally {
      setPwdSaving(false);
    }
  };

  useEffect(() => {
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    if (user) {
      setTargetScore(String(user.targetScore ?? 450));
      setExamDate((user.examDate || (user.examMode === 'undergraduate' ? '2027-06-30' : '2027-01-10')).slice(0, 10));
    }
    Promise.all([
      statisticsService.getProgressData(uid, 30),
      statisticsService.getRadarData(uid),
      exerciseService.getExercises({ userId: uid, limit: 8 }),
      achievementService.getAchievements(uid),
    ])
      .then(([p, r, e, a]) => {
        setProgress(p.data);
        setRadar(r.data);
        setExercises(e.data);
        setAchievements(a.data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const doExport = async () => {
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    try {
      const res = await exportService.exportAll(uid);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spring-exam-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSavedMsg('❌ 导出失败');
    }
  };

  const saveTarget = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const score = Number(targetScore);
      await userService.updateMe({
        ...(Number.isFinite(score) && score > 0 ? { targetScore: score } : {}),
        ...(examDate ? { examDate: new Date(examDate).toISOString() } : {}),
      });
      setSavedMsg('✅ 已保存');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch {
      setSavedMsg('❌ 保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) return <div className="py-20 text-center text-gray-400">加载中…</div>;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* 用户卡片 */}
      <div className="card flex flex-wrap items-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon size={32} />
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold">{user?.username || '学习者'}</div>
          <div className="text-sm text-gray-500">
            {user?.examMode === 'undergraduate' ? '大学学习助手 · 支持多科目备考' : '2027 广东春季高考 · 语数英三科 · 单用户复习系统'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`chip ${user?.examMode === 'undergraduate' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-primary/10 text-primary'}`}>
            <Target size={12} /> {user?.examMode === 'undergraduate' ? '本科模式' : '春考模式'}
          </span>
          <span className="chip bg-primary/10 text-primary"><Target size={12} /> 目标 {user?.targetScore || 450} 分</span>
          <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
            <CalendarDays size={12} /> 考试 {fmtDate(user?.examDate || (user.examMode === 'undergraduate' ? '2027-06-30' : '2027-01-10'))}
          </span>
          <Link to="/insights" className="chip bg-info/10 text-info hover:bg-info/20"><BarChart3 size={12} /> 数据洞察</Link>
          <Link to="/resources" className="chip bg-accent/10 text-accent hover:bg-accent/20"><BookMarked size={12} /> 资料库</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="chip bg-ink text-white hover:bg-black"><Lock size={12} /> 管理后台</Link>
          )}
          <button onClick={doExport} className="chip bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300" title="导出全部学习数据">
            <Download size={12} /> 导出
          </button>
        </div>
      </div>

      {/* 考试模式切换 */}
      <div className="card p-5">
        <h3 className="mb-3 font-semibold">🔄 切换考试模式</h3>
        <p className="mb-3 text-sm text-gray-500">当前模式：<b>{user?.examMode === 'undergraduate' ? '本科学习（CET-4/6、雅思、托福、法律、大学通识课）' : '春季高考（语文/数学/英语）'}</b>，切换后数据完全隔离</p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={async () => {
              try {
                await userService.updateMe({ examMode: 'spring', examTargets: undefined });
                window.location.reload();
              } catch { /* ignore */ }
            }}
            className={`btn-outline text-sm ${user?.examMode !== 'spring' ? 'border-primary text-primary font-bold' : ''}`}
          >
            🌾 春考模式
          </button>
          <button
            onClick={async () => {
              try {
                await userService.updateMe({
                  examMode: 'undergraduate',
                  examTargets: { subjects: ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'], goalScore: 600 },
                });
                window.location.reload();
              } catch { /* ignore */ }
            }}
            className={`btn-outline text-sm ${user?.examMode === 'undergraduate' ? 'border-primary text-primary font-bold' : ''}`}
          >
            🎓 本科模式（CET/雅思/托福/法律/大学课）
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          ⚠️ 切换模式后，当前账号将切换到对应科目的练习、错题和背诵数据，两者互不干扰。
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 进步曲线 */}
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-1.5 font-semibold"><TrendingUp size={16} className="text-primary" /> 练习正确率趋势（近 30 天）</h3>
          {progress.length >= 2 ? (
            <LineTrendChart
              data={progress.map((p) => p.accuracy)}
              labels={progress.map((p) => p.date.slice(5))}
              name="正确率"
            />
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">
              {progress.length === 0 ? '还没有练习记录，去「练习」页刷几道题吧' : '至少需要 2 天记录才能绘制曲线'}
            </div>
          )}
        </div>

        {/* 雷达图 */}
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">🧭 五维能力雷达</h3>
          {radar.length ? (
            <RadarChart data={radar.map((r) => ({ name: r.subject, value: r.mastery }))} />
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">暂无数据</div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] text-gray-400">
            {radar.map((d) => (
              <div key={d.subject}>
                {d.subject} {d.mastery}%
                <div className="text-gray-300 dark:text-gray-600">
                  正确率 {d.accuracy}% · 稳定 {d.stability ?? '-'} · {d.duration}h · 冲刺 {d.pace ?? '-'}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-[10px] text-gray-400">
            五维：掌握度 / 正确率 / 投入时长 / 稳定性（低波动高稳定）/ 冲刺进度
          </div>
        </div>
      </div>

      {/* 最近练习 */}
      <div className="card p-5">
        <h3 className="mb-4 font-semibold">📝 最近练习记录</h3>
        {exercises.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">还没有练习记录</div>
        ) : (
          <ul className="space-y-2">
            {exercises.map((ex) => (
              <li key={ex.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-2.5 text-sm dark:border-gray-700">
                <CheckCircle2 size={16} className={`shrink-0 ${ex.accuracy >= 80 ? 'text-primary' : ex.accuracy >= 50 ? 'text-accent' : 'text-error'}`} />
                <span className="font-medium">{ex.subject?.name || '练习'}</span>
                <span className="text-xs text-gray-400">{fmtDate(ex.createdAt)}</span>
                <span className="ml-auto">
                  答对 <b className={ex.accuracy >= 80 ? 'text-primary' : 'text-accent'}>{ex.correctCount}</b> / {ex.totalQuestions} 题
                  <span className="ml-2 font-semibold text-primary">{Math.round(ex.accuracy)}%</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 学习目标设置 */}
      <div className="card p-5">
        <h3 className="mb-3 font-semibold">🎯 学习目标</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-xs text-gray-500">目标分数</label>
            <input
              type="number"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">考试日期（以官方公布为准）</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <button className="btn-primary" onClick={saveTarget} disabled={saving}>
            <Save size={14} /> {saving ? '保存中…' : '保存'}
          </button>
        </div>
        {savedMsg && <div className="mt-2 text-xs font-medium text-primary">{savedMsg}</div>}
      </div>

      {/* 账号与退出 */}
      <div className="card p-5">
        <h3 className="mb-1 font-semibold">👤 我的账号</h3>
        <div className="mb-3 text-xs text-gray-400">当前登录：{user?.username || '—'}</div>

        <div className="mb-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="text-xs font-medium text-gray-500">修改密码</div>
          <input
            type="password"
            className="input"
            placeholder="旧密码"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="新密码（至少 6 位）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="确认新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {pwdMsg && <div className={`text-xs font-medium ${pwdError ? 'text-error' : 'text-primary'}`}>{pwdMsg}</div>}
          <button className="btn-outline w-full text-sm" onClick={changePwd} disabled={pwdSaving}>
            {pwdSaving ? '修改中…' : '🔑 确认修改密码'}
          </button>
        </div>

        <button
          className="w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
          onClick={async () => {
            try {
              await authService.logout();
            } catch {
              // 忽略登出接口异常，本地会话照常清除
            }
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = '/login';
          }}
        >
          退出登录
        </button>
      </div>

      {/* 成就徽章 */}
      <div className="card p-5">
        <h3 className="mb-1 font-semibold">🏅 成就徽章</h3>
        <div className="mb-4 text-xs text-gray-400">已解锁 {unlockedCount} / {achievements.length} 枚</div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
                a.unlocked
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-gray-100 opacity-50 dark:border-gray-700'
              }`}
            >
              <div className={`text-2xl ${a.unlocked ? '' : 'grayscale'}`}>{a.unlocked ? a.icon : <Lock size={20} className="text-gray-300 dark:text-gray-600" />}</div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{a.name}</div>
              <div className="text-[10px] leading-tight text-gray-400">{a.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
