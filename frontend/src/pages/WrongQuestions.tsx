import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Eraser, Filter, Play, RefreshCw } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { wrongQuestionService } from '@/services/wrongQuestionService';
import { knowledgeService } from '@/services/knowledgeService';
import { fmtDate, questionTypeLabel } from '@/utils/date';
import { normalizeQuestionOptions } from '@/utils/question';
import type { KnowledgePoint, WrongQuestion } from '@/types';

export default function WrongQuestions() {
  const { userId } = useUser();
  const navigate = useNavigate();

  const [list, setList] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [knowledgeId, setKnowledgeId] = useState('');
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [reviewMode, setReviewMode] = useState<WrongQuestion | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewResult, setReviewResult] = useState('');
  const [dueList, setDueList] = useState<WrongQuestion[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await wrongQuestionService.getWrongQuestions({ userId, limit: 100 });
      setList(res.data);
      const due = await wrongQuestionService.getReviewDue().catch(() => ({ data: [] }));
      setDueList(due.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    knowledgeService.getKnowledge()
      .then((res) => setPoints(res.data.filter((p) => p.level === 2)))
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    return list.filter((w) => {
      if (subject && w.question.subjectId !== subject) return false;
      if (knowledgeId && !w.question.questionKnowledge?.some((qk) => qk.knowledgePoint.id === knowledgeId)) return false;
      return true;
    });
  }, [list, subject, knowledgeId]);

  const pending = filtered.filter((w) => !w.mastered);
  const mastered = filtered.filter((w) => w.mastered);

  const startReview = (w: WrongQuestion) => {
    setReviewMode(w);
    setReviewAnswer('');
    setReviewResult('');
  };

  const submitReview = async (correct: boolean) => {
    if (!reviewMode) return;
    const res = await wrongQuestionService.reviewWrongQuestion(reviewMode.id, correct);
    const updated = res.data;
    setReviewResult(
      updated.mastered
        ? '🎉 连续答对 2 次，该错题已消化！'
        : '✅ 答对了！还需连续答对 1 次即可消化'
    );
    setList((prev) => prev.map((w) => (w.id === reviewMode.id ? { ...w, reviewCount: updated.reviewCount, mastered: updated.mastered } : w)));
    setTimeout(() => setReviewMode(null), 1800);
  };

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of list) {
      const s = w.question.subject;
      if (s) map.set(s.id, s.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [list]);

  if (reviewMode) {
    const q = reviewMode.question;
    const options = normalizeQuestionOptions(q.options);
    const solution = q.solution as any;
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <button className="btn-outline text-sm" onClick={() => setReviewMode(null)}>← 返回错题本</button>
        <div className="card p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="chip bg-red-100 text-red-600 dark:bg-red-900/40">错 {reviewMode.wrongCount} 次</span>
            <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">重练 {reviewMode.reviewCount} 次</span>
            <span className="chip bg-blue-100 text-blue-600 dark:bg-blue-900/40">{questionTypeLabel(q.type)}</span>
            {q.questionKnowledge?.[0] && (
              <span className="chip bg-blue-100 text-blue-600 dark:bg-blue-900/40">
                {q.questionKnowledge[0].knowledgePoint.code} {q.questionKnowledge[0].knowledgePoint.name}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</div>
          {q.type === 'choice' && options.length > 0 && (
            <div className="mt-4 space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                  <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                  {opt.replace(/^[A-E][.、]\s*/, '')}
                </div>
              ))}
            </div>
          )}
          {q.type !== 'choice' && (
            <textarea
              className="input mt-4 min-h-[100px]"
              placeholder="输入你的答案…（五选五请按顺序填入字母）"
              value={reviewAnswer}
              onChange={(e) => setReviewAnswer(e.target.value)}
            />
          )}
          <div className="mt-4 flex gap-2">
            <button className="btn-primary flex-1" onClick={() => submitReview(true)}>我做对了 ✅</button>
            <button className="btn-accent flex-1" onClick={() => submitReview(false)}>还是错了 ❌</button>
          </div>
          {reviewResult && <div className="mt-3 text-center text-sm font-medium text-primary">{reviewResult}</div>}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500">查看解析（不确定时参考）</summary>
            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              {solution?.analysis || '（无解析）'}
            </div>
            <div className="mt-2 text-sm"><span className="text-red-500">答案：</span><span className="font-mono">{q.answer}</span></div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">📕 错题本（待重练 {pending.length} ｜ 已消化 {mastered.length}）</h2>
        <div className="flex gap-2">
          <button className="btn-accent" onClick={() => navigate('/practice?mode=wrong')}>
            <Play size={16} /> 一键错题重练卷
          </button>
          <button className="btn-outline" onClick={load}><RefreshCw size={16} /> 刷新</button>
        </div>
      </div>

      {/* 今日待复习（艾宾浩斯到期） */}
      {dueList.length > 0 && (
        <div className="card border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-900/10">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <CalendarClock size={15} /> 今日待复习（{dueList.length} 道到期错题）
          </div>
          <div className="flex flex-wrap gap-2">
            {dueList.slice(0, 6).map((w) => (
              <button
                key={w.id}
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-xs hover:bg-amber-100 dark:border-amber-500/40 dark:bg-gray-800 dark:hover:bg-amber-900/30"
                onClick={() => startReview(w)}
              >
                <div className="mb-0.5 line-clamp-1 max-w-[240px] text-gray-700 dark:text-gray-200">{w.question.stem}</div>
                <div className="text-amber-500">{w.question.subject?.name || ''} · 重练第 {w.reviewCount + 1} 轮</div>
              </button>
            ))}
            {dueList.length > 6 && (
              <span className="self-center text-xs text-gray-400">还有 {dueList.length - 6} 道…</span>
            )}
          </div>
        </div>
      )}

      {/* 筛选 */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <Filter size={16} className="text-gray-400" />
        <select className="input !w-32" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">全部科目</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input !w-52" value={knowledgeId} onChange={(e) => setKnowledgeId(e.target.value)}>
          <option value="">全部知识点</option>
          {points.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <div className="text-gray-500">没有错题，太棒了！继续保持～</div>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((w) => (
            <div key={w.id} className="card border-l-4 border-l-error p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="chip bg-red-100 text-red-600 dark:bg-red-900/40"><AlertTriangle size={12} /> 待重练</span>
                <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  错 {w.wrongCount} 次 · 重练 {w.reviewCount} 次
                </span>
                {w.question.questionKnowledge?.[0] && (
                  <span className="chip bg-blue-100 text-blue-600 dark:bg-blue-900/40">
                    {w.question.questionKnowledge[0].knowledgePoint.code} {w.question.questionKnowledge[0].knowledgePoint.name}
                  </span>
                )}
                <span className="text-gray-400">最近做错：{fmtDate(w.lastWrongAt)}</span>
              </div>
              <div className="line-clamp-2 text-sm text-gray-700 dark:text-gray-200">{w.question.stem}</div>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary text-xs" onClick={() => startReview(w)}>
                  <Eraser size={14} /> 重练此题
                </button>
              </div>
            </div>
          ))}
          {mastered.map((w) => (
            <div key={w.id} className="card p-4 opacity-60">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="chip bg-green-100 text-green-600 dark:bg-green-900/40"><CheckCircle2 size={12} /> 已消化</span>
                <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  错 {w.wrongCount} 次 · 重练 {w.reviewCount} 次
                </span>
                {w.question.questionKnowledge?.[0] && (
                  <span className="chip bg-blue-100 text-blue-600 dark:bg-blue-900/40">
                    {w.question.questionKnowledge[0].knowledgePoint.code}
                  </span>
                )}
              </div>
              <div className="line-clamp-1 text-sm text-gray-500 dark:text-gray-400">{w.question.stem}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
