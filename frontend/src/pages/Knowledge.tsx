import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Link2, PenLine, Sparkles, Star, X } from 'lucide-react';
import { knowledgeService } from '@/services/knowledgeService';
import { aiService } from '@/services/aiService';
import { freqLabel, statusColor, statusLabel } from '@/utils/date';
import type { KnowledgePoint } from '@/types';

interface ChapterGroup {
  id: string;
  name: string;
  code: string;
  order: number;
  points: KnowledgePoint[];
}

interface SubjectGroup {
  id: string;
  code: string;
  name: string;
  chapters: ChapterGroup[];
}

type Filter = 'all' | 'new' | 'weak';

const SUBJECT_TABS = [
  { code: 'Y', label: '语文' },
  { code: 'M', label: '数学' },
  { code: 'E', label: '英语' },
];

export default function Knowledge() {
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [activeSubject, setActiveSubject] = useState('Y');
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<{
    point: KnowledgePoint;
    detail: KnowledgePoint & { prerequisitesDetails?: KnowledgePoint[] };
    aiExplain: string;
    loadingAI: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    knowledgeService.getKnowledge()
      .then((res) => {
        const points = res.data;
        // 按科目 → 章节 分组
        const subjectMap = new Map<string, SubjectGroup>();
        const chapterMap = new Map<string, ChapterGroup>();

        for (const p of points) {
          const subject = p.chapter?.subject;
          if (!subject) continue;
          if (!subjectMap.has(subject.code)) {
            subjectMap.set(subject.code, { id: subject.id, code: subject.code, name: subject.name, chapters: [] });
          }
          const sg = subjectMap.get(subject.code)!;
          if (p.level !== 2) continue; // 只展示考点级（level=2）
          if (!chapterMap.has(p.chapterId)) {
            const ch = {
              id: p.chapterId,
              name: p.chapter.name,
              code: p.chapter.code,
              order: p.chapter.order,
              points: [],
            };
            chapterMap.set(p.chapterId, ch);
            sg.chapters.push(ch);
          }
          chapterMap.get(p.chapterId)!.points.push(p);
        }
        for (const sg of subjectMap.values()) {
          sg.chapters.sort((a, b) => a.order - b.order);
        }
        const list = Array.from(subjectMap.values()).sort((a, b) => a.code.localeCompare(b.code));
        setSubjects(list);
        if (list.length > 0) {
          setActiveSubject(list[0].code);
          if (list[0].chapters.length > 0) setActiveChapter(list[0].chapters[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const current = useMemo(() => subjects.find((s) => s.code === activeSubject), [subjects, activeSubject]);
  const chapters = current?.chapters || [];

  const visiblePoints = (ch: ChapterGroup) => {
    let pts = ch.points;
    if (filter === 'new') pts = pts.filter((p) => p.mark === 'new');
    if (filter === 'weak') pts = pts.filter((p) => p.mastery < 40 && p.status !== 'mastered');
    const kw = search.trim().toLowerCase();
    if (kw) pts = pts.filter((p) => p.name.toLowerCase().includes(kw) || p.code.toLowerCase().includes(kw));
    return pts;
  };

  const openDrawer = async (point: KnowledgePoint) => {
    setDrawer({ point, detail: point, aiExplain: '', loadingAI: true });
    try {
      const [detailRes, explainRes] = await Promise.all([
        knowledgeService.getKnowledgeById(point.id),
        aiService.explainKnowledge(point.id).catch(() => null),
      ]);
      setDrawer({
        point,
        detail: detailRes?.data || point,
        aiExplain: explainRes?.data?.explanation || '（AI 讲解暂不可用）',
        loadingAI: false,
      });
    } catch {
      setDrawer({ point, detail: point, aiExplain: '（AI 讲解暂不可用）', loadingAI: false });
    }
  };

  const switchSubject = (code: string) => {
    setActiveSubject(code);
    const sg = subjects.find((s) => s.code === code);
    setActiveChapter(sg?.chapters[0]?.id || null);
  };

  if (loading) return <div className="py-20 text-center text-gray-400">加载中…</div>;

  return (
    <div className="flex gap-5 p-4 sm:p-6">
      {/* 左侧：科目 + 章节树 */}
      <div className="w-56 shrink-0 lg:w-64">
        <div className="card p-3">
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
            {SUBJECT_TABS.map((s) => (
              <button
                key={s.code}
                onClick={() => switchSubject(s.code)}
                className={`rounded-md py-1.5 text-xs font-medium ${
                  activeSubject === s.code ? 'bg-white text-primary shadow dark:bg-gray-700' : 'text-gray-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mb-3 flex gap-1">
            {(['all', 'new', 'weak'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-md px-2 py-1 text-xs ${
                  filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-900'
                }`}
              >
                {{ all: '全部', new: '🆕新增', weak: '⚠️薄弱' }[f]}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="🔍 搜索考点（名称/编号）"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
          />
          <ul className="space-y-0.5">
            {chapters.map((ch) => {
              const cnt = visiblePoints(ch).length;
              return (
                <li key={ch.id}>
                  <button
                    onClick={() => setActiveChapter(ch.id)}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      activeChapter === ch.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ChevronRight size={14} className={`shrink-0 transition-transform ${activeChapter === ch.id ? 'rotate-90' : ''}`} />
                    <span className="flex-1 truncate">{ch.name}</span>
                    <span className="text-[10px] text-gray-400">{cnt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 右侧：考点卡片 */}
      <div className="min-w-0 flex-1">
        {chapters.filter((c) => c.id === activeChapter).map((ch) => (
          <div key={ch.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{ch.name}</h2>
              <span className="text-xs text-gray-400">共 {ch.points.length} 个考点</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePoints(ch).map((p) => (
                <button
                  key={p.id}
                  onClick={() => openDrawer(p)}
                  className="card group p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-400">{p.code}</span>
                    <span className="flex items-center gap-1">
                      {p.mark === 'new' && <span className="chip bg-orange-100 text-orange-600 dark:bg-orange-900/40">🆕新增</span>}
                      {p.mark === 'deleted' && <span className="chip bg-gray-200 text-gray-500 line-through">已删</span>}
                      {p.mastery < 40 && p.status !== 'mastered' && (
                        <span className="chip bg-red-100 text-red-600 dark:bg-red-900/40">需强化</span>
                      )}
                    </span>
                  </div>
                  <div className="mb-1 font-medium leading-snug">{p.name}</div>
                  <div className="mb-2 flex items-center gap-2 text-xs">
                    <span className="text-accent">{freqLabel(p.frequency)}</span>
                    <span className="flex text-amber-400">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={10} fill={i < p.difficulty ? 'currentColor' : 'none'} />
                      ))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar flex-1">
                      <div className="h-full bg-primary transition-all" style={{ width: `${p.mastery}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-primary">{p.mastery}%</span>
                    <span className={`chip ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
                  </div>
                </button>
              ))}
              {visiblePoints(ch).length === 0 && (
                <div className="col-span-full py-10 text-center text-sm text-gray-400">该筛选条件下暂无考点</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 考点详情抽屉 */}
      {drawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl dark:bg-gray-800">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
              <div>
                <div className="text-xs text-gray-400">{drawer.point.code} · {drawer.point.chapter?.name}</div>
                <h3 className="text-lg font-bold">{drawer.point.name}</h3>
              </div>
              <button onClick={() => setDrawer(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* 状态信息 */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-400">掌握度</div>
                  <div className="text-xl font-bold text-primary">{drawer.point.mastery}%</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-400">状态</div>
                  <div className={`mt-1.5 chip ${statusColor(drawer.point.status)}`}>{statusLabel(drawer.point.status)}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-400">难度</div>
                  <div className="mt-1.5 flex text-amber-400">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} fill={i < drawer.point.difficulty ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-accent"
                  onClick={() => { navigate(`/practice?knowledge=${drawer.point.id}`); }}
                >
                  <PenLine size={16} /> 专项练习
                </button>
                <button
                  className="btn-outline"
                  onClick={() => setDrawer({ ...drawer, loadingAI: true, aiExplain: '加载中…' })}
                >
                  <Sparkles size={16} /> AI 讲解
                </button>
              </div>

              {/* 前置依赖 */}
              <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Link2 size={14} className="text-info" /> 前置依赖
                </div>
                {(drawer.detail.prerequisitesDetails || []).length > 0 ? (
                  <ul className="space-y-1">
                    {(drawer.detail.prerequisitesDetails || []).map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-900">
                        <span>{p.code} {p.name}</span>
                        <span className={`chip ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
                      </li>
                    ))}
                  </ul>
                ) : drawer.point.prerequisites?.length > 0 ? (
                  <div className="text-sm text-gray-500">{drawer.point.prerequisites.join('、')}</div>
                ) : (
                  <div className="text-sm text-gray-400">该考点无前置依赖（基础考点）</div>
                )}
                {drawer.point.mastery < 40 && drawer.point.status !== 'mastered' && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    掌握薄弱：建议先巩固前置知识点，再做本考点专项练习。
                  </div>
                )}
              </div>

              {/* AI 讲解 */}
              <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles size={14} className="text-accent" /> AI 知识点讲解
                </div>
                {drawer.loadingAI ? (
                  <div className="text-sm text-gray-400">加载中…</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {drawer.aiExplain}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
