import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, type AdminStats, type AdminQuestion, type AdminFeedback, type AdminUser } from '@/services/adminService';
import { subjectService } from '@/services/subjectService';
import type { Subject } from '@/types';
import { useUser } from '@/hooks/useUser';

const TABS = [
  { id: 'overview', label: '数据总览' },
  { id: 'questions', label: '题库管理' },
  { id: 'feedbacks', label: '纠错反馈' },
  { id: 'users', label: '用户管理' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PERMISSIONS = [
  '数据总览：查看全站题目数、用户数、模考与练习总量',
  '题库管理：浏览/编辑题目题干、选项、答案、解析，下架错误题目',
  '纠错反馈：处理用户提交的「题目有误」反馈（标记已修正 / 忽略）',
  '用户管理：查看用户列表，设置/取消管理员，删除违规账号',
];

export default function Admin() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // 非管理员跳回首页
  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    subjectService.getSubjects().then((r) => setSubjects(r.data)).catch(() => setSubjects([]));
  }, []);

  const loadStats = useCallback(() => {
    adminService.getStats().then(setStats).catch(() => setStats(null));
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return <PageFallback />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* 标题 + 权限说明 */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black tracking-tight">管理后台</h1>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="chip chip-blue">当前账号：{user.username}</span>
          <span className="chip chip-red">管理员</span>
        </div>
        <div className="mt-3 card p-4">
          <p className="font-bold text-sm mb-2">管理员权限说明</p>
          <ul className="grid md:grid-cols-2 gap-1.5 text-sm text-ink/80">
            {PERMISSIONS.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="geo-yellow-circle !w-2.5 !h-2.5 mt-1" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold uppercase border-2 border-ink ${
              tab === t.id ? 'bg-ink text-white shadow-bauhaus-sm' : 'bg-paper hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview stats={stats} />}
      {tab === 'questions' && <Questions subjects={subjects} />}
      {tab === 'feedbacks' && <Feedbacks />}
      {tab === 'users' && <Users me={user.id} />}
    </div>
  );
}

function PageFallback() {
  return <div className="p-8 text-center text-gray-400">加载中…</div>;
}

// ---------- 数据总览 ----------
function Overview({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <div className="card p-6 text-center text-gray-500">加载失败</div>;
  const cards = [
    { label: '注册用户', value: stats.users },
    { label: '题库题目', value: stats.questions },
    { label: '待处理纠错', value: stats.pendingFeedbacks },
    { label: '完成模考', value: stats.exams },
    { label: '练习记录', value: stats.exercises },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4 text-center">
          <div className="text-3xl font-black font-display">{c.value}</div>
          <div className="text-xs text-gray-500 mt-1">{c.label}</div>
        </div>
      ))}
      <div className="col-span-2 md:col-span-5 card p-4">
        <p className="font-bold mb-3">题库分布（按科目）</p>
        <div className="flex gap-2 flex-wrap">
          {stats.bySubject.map((s) => (
            <span key={s.name} className="chip chip-yellow">{s.name} {s.count} 题</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 题库管理 ----------
function Questions({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState('');
  const [list, setList] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [form, setForm] = useState({ stem: '', options: '', answer: '', analysis: '', section: '', difficulty: 3 });
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    adminService.getQuestions({ subjectId: subjectId || undefined, page, pageSize: 20 }).then((r) => {
      setList(r.list);
      setTotal(r.total);
    }).catch(() => setList([]));
  }, [subjectId, page]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (q: AdminQuestion) => {
    setEditing(q);
    setForm({
      stem: q.stem,
      options: q.options ? q.options.join('\n') : '',
      answer: q.answer,
      analysis: q.solution?.analysis || '',
      section: q.section || '',
      difficulty: q.difficulty,
    });
  };

  const save = async () => {
    if (!editing) return;
    const data: Partial<AdminQuestion> = {
      stem: form.stem,
      answer: form.answer,
      analysis: form.analysis,
      section: form.section,
      difficulty: Number(form.difficulty),
    };
    if (form.options.trim()) data.options = form.options.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      await adminService.updateQuestion(editing.id, data);
      setMsg('✅ 已保存');
      setEditing(null);
      load();
    } catch {
      setMsg('❌ 保存失败');
    }
  };

  const archive = async (q: AdminQuestion) => {
    if (!window.confirm(`确定下架该题？\n${q.stem.slice(0, 40)}…`)) return;
    try {
      await adminService.archiveQuestion(q.id);
      load();
    } catch { /* ignore */ }
  };

  const sectionOptions = subjectId ? Array.from(new Set(list.map((q) => q.section).filter(Boolean))) : [];

  return (
    <div>
      <div className="flex gap-2 items-center mb-4 flex-wrap">
        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }} className="input px-3 py-2 text-sm">
          <option value="">全部科目</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {sectionOptions.length > 0 && (
          <span className="text-xs text-gray-500">分区：{sectionOptions.join(' / ')}</span>
        )}
        <span className="ml-auto text-sm text-gray-500">共 {total} 题</span>
      </div>

      <div className="space-y-2">
        {list.map((q) => (
          <div key={q.id} className="card p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1">
                {q.subject?.name} · {q.type} {q.section ? `· ${q.section}` : ''} · 难度{q.difficulty} · {q.source}
                {q.status !== 'active' && <span className="chip chip-red ml-2">{q.status}</span>}
              </div>
              <div className="text-sm line-clamp-2">{q.stem}</div>
              <div className="text-xs text-ink/60 mt-1">答案：{q.answer}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(q)} className="btn btn-ink !px-3 !py-1 text-xs">编辑</button>
              <button onClick={() => archive(q)} className="btn btn-red !px-3 !py-1 text-xs">下架</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="card p-6 text-center text-gray-500">暂无题目</div>}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-ink !px-4 !py-1 text-sm">上一页</button>
          <span className="text-sm text-gray-500 self-center">第 {page} / {Math.ceil(total / 20)} 页</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)} className="btn btn-ink !px-4 !py-1 text-sm">下一页</button>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="card bg-paper p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-black text-lg mb-4">编辑题目</h3>
            <label className="block text-xs font-bold mb-1">题干</label>
            <textarea value={form.stem} onChange={(e) => setForm({ ...form, stem: e.target.value })} rows={3} className="input w-full p-2 text-sm mb-3" />
            <label className="block text-xs font-bold mb-1">选项（每行一个，留空表示无选项）</label>
            <textarea value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} rows={4} className="input w-full p-2 text-sm mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold mb-1">答案</label>
                <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="input w-full p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">难度 (1-5)</label>
                <input type="number" min={1} max={5} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })} className="input w-full p-2 text-sm" />
              </div>
            </div>
            <label className="block text-xs font-bold mb-1">分区</label>
            <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="input w-full p-2 text-sm mb-3" />
            <label className="block text-xs font-bold mb-1">解析</label>
            <textarea value={form.analysis} onChange={(e) => setForm({ ...form, analysis: e.target.value })} rows={3} className="input w-full p-2 text-sm mb-4" />
            {msg && <div className="text-sm mb-3">{msg}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn btn-ink !px-4 !py-2 text-sm">取消</button>
              <button onClick={save} className="btn btn-primary !px-4 !py-2 text-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 纠错反馈 ----------
function Feedbacks() {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState<AdminFeedback[]>([]);

  const load = useCallback(() => {
    adminService.getFeedbacks(status).then(setList).catch(() => setList([]));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, s: 'fixed' | 'ignored') => {
    await adminService.resolveFeedback(id, s);
    load();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'fixed', 'ignored'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 text-sm border-2 border-ink ${status === s ? 'bg-ink text-white' : 'bg-paper'}`}>
            {s === 'pending' ? '待处理' : s === 'fixed' ? '已修正' : '已忽略'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((f) => (
          <div key={f.id} className="card p-3">
            <div className="text-xs text-gray-500 mb-1">
              {new Date(f.createdAt).toLocaleString('zh-CN')} · {f.question?.subject?.name || '?'}
            </div>
            <div className="text-sm mb-1 line-clamp-2">题目：{f.question?.stem || '（题目已删除）'}</div>
            <div className="text-sm text-primary font-medium mb-2">反馈：{f.reason}</div>
            {status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => resolve(f.id, 'fixed')} className="btn btn-primary !px-3 !py-1 text-xs">已修正</button>
                <button onClick={() => resolve(f.id, 'ignored')} className="btn btn-ink !px-3 !py-1 text-xs">忽略</button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="card p-6 text-center text-gray-500">暂无反馈</div>}
      </div>
    </div>
  );
}

// ---------- 用户管理 ----------
function Users({ me }: { me: string }) {
  const [list, setList] = useState<AdminUser[]>([]);

  const load = useCallback(() => {
    adminService.getUsers().then(setList).catch(() => setList([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleRole = async (u: AdminUser) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`${u.role === 'admin' ? '取消' : '设为'}管理员：${u.username}？`)) return;
    try {
      await adminService.setUserRole(u.id, next);
      load();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || '操作失败');
    }
  };

  const del = async (u: AdminUser) => {
    if (!window.confirm(`删除用户 ${u.username}？其所有学习数据将一并删除。`)) return;
    try {
      await adminService.deleteUser(u.id);
      load();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || '操作失败');
    }
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-ink bg-gray-50">
            <th className="text-left p-3 font-bold">用户名</th>
            <th className="text-left p-3 font-bold">角色</th>
            <th className="text-left p-3 font-bold">目标分</th>
            <th className="text-left p-3 font-bold">练习</th>
            <th className="text-left p-3 font-bold">模考</th>
            <th className="text-left p-3 font-bold">注册时间</th>
            <th className="text-left p-3 font-bold">操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u) => (
            <tr key={u.id} className="border-b border-gray-200">
              <td className="p-3">{u.username} {u.id === me && <span className="text-xs text-gray-400">(我)</span>}</td>
              <td className="p-3">{u.role === 'admin' ? <span className="chip chip-red">管理员</span> : <span className="chip chip-blue">用户</span>}</td>
              <td className="p-3">{u.targetScore}</td>
              <td className="p-3">{u._count.exerciseRecords}</td>
              <td className="p-3">{u._count.examRecords}</td>
              <td className="p-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
              <td className="p-3 flex gap-2">
                <button onClick={() => toggleRole(u)} disabled={u.id === me} className="btn btn-ink !px-2 !py-1 text-xs disabled:opacity-40">
                  {u.role === 'admin' ? '取消管理' : '设为管理'}
                </button>
                <button onClick={() => del(u)} disabled={u.id === me} className="btn btn-red !px-2 !py-1 text-xs disabled:opacity-40">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <div className="p-6 text-center text-gray-500">暂无用户</div>}
    </div>
  );
}
