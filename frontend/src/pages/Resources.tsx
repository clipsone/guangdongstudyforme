import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Film, Headphones, Plus, Trash2 } from 'lucide-react';
import { subjectService } from '@/services/subjectService';
import { resourceService } from '@/services/resourceService';
import { fmtDate } from '@/utils/date';
import type { Resource, Subject } from '@/types';

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  document: { icon: <FileText size={16} />, label: '文档', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' },
  video: { icon: <Film size={16} />, label: '视频', color: 'bg-red-100 text-red-600 dark:bg-red-900/40' },
  audio: { icon: <Headphones size={16} />, label: '音频', color: 'bg-green-100 text-green-600 dark:bg-green-900/40' },
};

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'document', url: '', description: '', subjectId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await resourceService.getResources({ ...(subjectId ? { subjectId } : {}), ...(type ? { type } : {}) });
      setResources(res.data);
    } catch (e: any) {
      setError(e?.error?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    subjectService.getSubjects().then((r) => setSubjects(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, type]);

  const save = async () => {
    if (!form.name || !form.url) {
      setError('名称和链接必填');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await resourceService.create({ ...form, subjectId: form.subjectId || undefined });
      setShowForm(false);
      setForm({ name: '', type: 'document', url: '', description: '', subjectId: '' });
      load();
    } catch (e: any) {
      setError(e?.error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('确定删除该资料？')) return;
    await resourceService.remove(id);
    load();
  };

  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name || '通用';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">📚 学习资料库</h2>
        <button className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> 添加资料
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-2">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800">
          <option value="">全部科目</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800">
          <option value="">全部类型</option>
          <option value="document">文档</option>
          <option value="video">视频</option>
          <option value="audio">音频</option>
        </select>
      </div>

      {/* 新增表单 */}
      {showForm && (
        <div className="card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="资料名称（必填）" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800">
              <option value="document">文档</option>
              <option value="video">视频</option>
              <option value="audio">音频</option>
            </select>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="链接 URL（必填）" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 sm:col-span-2" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简介（可选）" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 sm:col-span-2" />
            <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800">
              <option value="">通用</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-sm text-error">{error}</div>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={saving} onClick={save}>{saving ? '保存中…' : '保存'}</button>
            <button className="btn-outline" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中…</div>
      ) : resources.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-400">
          还没有资料，点击「添加资料」收藏你的学习资源（考纲、真题、视频课…）
        </div>
      ) : (
        <ul className="space-y-2">
          {resources.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.document;
            return (
              <li key={r.id} className="card flex items-center gap-3 p-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <div className="truncate text-xs text-gray-400">
                    {meta.label} · {subjectName(r.subjectId)} {r.description ? `· ${r.description}` : ''}
                  </div>
                </div>
                <span className="hidden text-xs text-gray-400 sm:block">{fmtDate(r.createdAt)}</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="btn-outline px-3 py-1.5 text-xs">
                  <ExternalLink size={13} /> 打开
                </a>
                <button className="text-gray-300 hover:text-error" onClick={() => remove(r.id)} title="删除">
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
