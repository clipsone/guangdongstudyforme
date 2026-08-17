import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, Brain, CheckCircle2, RotateCcw } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { subjectService } from '@/services/subjectService';
import { recitationService } from '@/services/recitationService';
import { fmtDate, STAGE_LABEL } from '@/utils/date';
import type { RecitationItem, Subject } from '@/types';

type Category = 'essay' | 'vocabulary' | 'formula';

const TABS: Array<{ key: Category; label: string; subjectCode: string; desc: string }> = [
  { key: 'essay', label: '📜 语文篇目', subjectCode: 'Y', desc: '12 篇必背篇目' },
  { key: 'vocabulary', label: '📚 英语词汇', subjectCode: 'E', desc: '核心词汇' },
  { key: 'formula', label: '🧮 数学公式', subjectCode: 'M', desc: '公式卡' },
];

interface RecordMap {
  [itemId: string]: { stage: number; nextReviewAt: string };
}

export default function Recitation() {
  const { userId } = useUser();
  const [tab, setTab] = useState<Category>('essay');
  const [items, setItems] = useState<RecitationItem[]>([]);
  const [records, setRecords] = useState<RecordMap>({});
  const [dueIds, setDueIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ itemId: string; msg: string } | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const subjectsRes = await subjectService.getSubjects();
      const subjects: Subject[] = subjectsRes.data;
      const current = TABS.find((t) => t.key === tab)!;
      const subject = subjects.find((s) => s.code === current.subjectCode);

      const [itemsRes, recordsRes, dueRes] = await Promise.all([
        recitationService.getRecitationItems({
          category: tab,
          ...(subject ? { subjectId: subject.id } : {}),
          limit: 200,
        }),
        recitationService.getMyRecords(userId),
        recitationService.getTodayRecitation(userId),
      ]);
      setItems(itemsRes.data);

      const recMap: RecordMap = {};
      for (const r of recordsRes.data) {
        recMap[r.itemId] = { stage: r.stage, nextReviewAt: r.nextReviewAt };
      }
      setRecords(recMap);
      setDueIds(new Set(dueRes.data.map((r) => r.itemId)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, userId]);

  const submit = async (item: RecitationItem, passed: boolean) => {
    const res = await recitationService.createRecitationRecord({
      userId,
      itemId: item.id,
      reviewed: true,
      ...(passed ? {} : { mastered: false }),
    });
    const rec = res.data;
    setRecords((prev) => ({
      ...prev,
      [item.id]: { stage: rec.stage, nextReviewAt: rec.nextReviewAt },
    }));
    setDueIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    const badges = (res as any)?.newAchievements || [];
    if (badges.length > 0) setNewBadges(badges.map((b: any) => b.name));
    setFeedback({
      itemId: item.id,
      msg: passed
        ? rec.stage >= 5
          ? '🎉 完成全部 5 个阶段，已达长期记忆！'
          : `✅ 已打卡！进入第 ${rec.stage} 天阶段，下次复习 ${fmtDate(rec.nextReviewAt)}`
        : '🔄 已标记不熟，已回退到第 1 天，明天再背一遍巩固',
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const progress = useMemo(() => {
    const total = items.length;
    const reviewed = items.filter((i) => records[i.id]).length;
    return { total, reviewed, pct: total ? Math.round((reviewed / total) * 100) : 0 };
  }, [items, records]);

  const dueCount = dueIds.size;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">🧠 背诵与记忆</h2>
        {dueCount > 0 && (
          <span className="btn-accent cursor-default text-xs">
            <Bell size={14} /> {dueCount} 项今日待复习（艾宾浩斯）
          </span>
        )}
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

      {/* Tab */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
              tab === t.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 text-gray-500 dark:border-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 进度条 */}
      <div className="card flex items-center gap-4 p-4">
        <Brain size={28} className="text-primary" />
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-500">本组背诵进度（{TABS.find((t) => t.key === tab)?.desc}）</span>
            <span className="font-semibold text-primary">{progress.reviewed}/{progress.total}（{progress.pct}%）</span>
          </div>
          <div className="progress-bar"><div className="h-full bg-primary" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const rec = records[item.id];
            const isDue = dueIds.has(item.id);
            const isDone = rec && rec.stage >= 5;
            return (
              <div key={item.id} className={`card p-4 ${isDue ? 'border-2 border-accent' : ''}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.title || item.content}</div>
                    {tab === 'vocabulary' && item.partOfSpeech && (
                      <div className="text-xs text-gray-400">{item.partOfSpeech}</div>
                    )}
                  </div>
                  <span className={`chip shrink-0 ${
                    isDone
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/40'
                      : isDue
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40'
                        : rec
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                  }`}>
                    {isDone ? '✅ 长期记忆' : isDue ? '⚠️ 待复习' : rec ? STAGE_LABEL[rec.stage] : '未开始'}
                  </span>
                </div>

                {/* 内容预览 */}
                <ItemPreview item={item} tab={tab} />

                <div className="mt-3 flex items-center gap-2">
                  <button className="btn-outline flex-1 text-xs" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                    <BookOpen size={13} /> {openId === item.id ? '收起' : '查看详情'}
                  </button>
                  <button
                    className="btn-error text-xs"
                    title="没背熟？回退到第 1 天，明天再背"
                    onClick={() => submit(item, false)}
                  >
                    <RotateCcw size={13} /> 不熟
                  </button>
                  <button className="btn-primary text-xs" onClick={() => submit(item, true)}>
                    <CheckCircle2 size={13} /> 打卡复习
                  </button>
                </div>
                {feedback?.itemId === item.id && (
                  <div className="mt-2 text-xs font-medium text-primary">{feedback.msg}</div>
                )}

                {/* 展开详情 */}
                {openId === item.id && (
                  <div className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                    <ItemDetail item={item} tab={tab} />
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-gray-400">暂无数据（请先运行种子导入）</div>
          )}
        </div>
      )}
    </div>
  );
}

/** 尝试解析 content 中的 JSON 对象 */
function parseContent(item: RecitationItem): any {
  try {
    const parsed = JSON.parse(item.content);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function ItemPreview({ item, tab }: { item: RecitationItem; tab: Category }) {
  if (tab === 'vocabulary') {
    return (
      <div className="text-sm">
        <div className="text-gray-600 dark:text-gray-300">{item.phonetic}</div>
        <div className="mt-0.5">{item.meaning}</div>
        {item.example && <div className="mt-1 line-clamp-1 text-xs text-gray-400">{item.example}</div>}
      </div>
    );
  }
  const c = parseContent(item);
  if (tab === 'formula') {
    return <div className="line-clamp-3 text-sm text-gray-700 dark:text-gray-200">{c?.formula || item.content}</div>;
  }
  // essay
  if (c?.fullText) {
    return <div className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{String(c.fullText).slice(0, 120)}…</div>;
  }
  return <div className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{item.content.slice(0, 120)}</div>;
}

function ItemDetail({ item, tab }: { item: RecitationItem; tab: Category }) {
  if (tab === 'vocabulary') {
    return (
      <div className="space-y-1 text-sm">
        <div>{item.phonetic} <span className="text-gray-400">{item.partOfSpeech}</span></div>
        <div className="font-medium">{item.meaning}</div>
        {item.example && <div className="text-gray-500">{item.example}</div>}
      </div>
    );
  }
  const c = parseContent(item);
  if (tab === 'formula') {
    return (
      <div className="text-sm">
        <div className="whitespace-pre-wrap">{c?.formula || item.content}</div>
        {c?.desc && <div className="mt-2 text-xs text-orange-500">⚠️ {c.desc}</div>}
        {c?.example && <div className="mt-2 text-xs text-gray-500">例：{c.example}</div>}
      </div>
    );
  }
  // essay
  if (c) {
    return (
      <div>
        {c.author && <div className="mb-2 text-xs text-gray-400">作者：{c.author}</div>}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.fullText || ''}</div>
        {Array.isArray(c.keySentences) && c.keySentences.length > 0 && (
          <>
            <div className="mb-1 mt-3 text-xs font-semibold text-gray-500">重点名句</div>
            {c.keySentences.map((k: string, i: number) => (
              <div key={i} className="text-sm text-gray-600 dark:text-gray-300">• {k}</div>
            ))}
          </>
        )}
        {Array.isArray(c.trickyChars) && c.trickyChars.length > 0 && (
          <>
            <div className="mb-1 mt-3 text-xs font-semibold text-orange-500">易错字（默写必看）</div>
            <div className="flex flex-wrap gap-1">
              {c.trickyChars.map((t: string, i: number) => (
                <span key={i} className="chip bg-orange-100 text-orange-600 dark:bg-orange-900/40">{t}</span>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  return <div className="whitespace-pre-wrap text-sm">{item.content}</div>;
}
