import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Flag, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { examService } from '@/services/examService';
import { studySessionService } from '@/services/studySessionService';
import { subjectService } from '@/services/subjectService';
import { aiService } from '@/services/aiService';
import { questionTypeLabel, fmtDate } from '@/utils/date';
import type { Exam, ExamTemplate, Question, Subject } from '@/types';

type Phase = 'list' | 'exam' | 'result';

interface AnswerEntry {
  questionId: string;
  userAnswer: string;
}

export default function ExamPage() {
  const { userId } = useUser();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [history, setHistory] = useState<Exam[]>([]);
  const [phase, setPhase] = useState<Phase>('list');
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [summary, setSummary] = useState<{ total: number; correct: number; accuracy: number } | null>(null);
  const [newBadges, setNewBadges] = useState<Array<{ name: string; icon: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 导入历年真题
  const [importOpen, setImportOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [importSubjectId, setImportSubjectId] = useState('');
  const [importYear, setImportYear] = useState('');
  const [importPaperName, setImportPaperName] = useState('');
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      examService.getTemplates(),
      examService.getExams(userId),
      subjectService.getSubjects(),
    ])
      .then(([tRes, hRes, sRes]) => {
        setTemplates(tRes.data);
        setHistory(hRes.data);
        setSubjects(sRes.data);
        if (sRes.data.length > 0 && !importSubjectId) setImportSubjectId(sRes.data[0].id);
      })
      .catch((e: any) => setError(e?.error?.message || '加载模考数据失败'));
  }, [userId]);

  // 导入历年真题：粘贴试卷文本 → AI 解析入库并生成真题卷模板
  const doImport = async () => {
    if (!importText.trim()) {
      setImportMsg('请先粘贴试卷文本');
      return;
    }
    setImportLoading(true);
    setImportMsg('');
    try {
      const res = await aiService.importRealExam({
        subjectId: importSubjectId,
        ...(importYear ? { year: importYear } : {}),
        ...(importPaperName ? { paperName: importPaperName } : {}),
        text: importText,
      });
      setImportMsg(`✅ 成功导入 ${res.data.imported} 道真题，已生成试卷「${res.data.template.name}」`);
      setImportText('');
      setImportOpen(false);
      const tRes = await examService.getTemplates();
      setTemplates(tRes.data);
    } catch (e: any) {
      setImportMsg(e?.error?.message || '导入失败，请重试');
    } finally {
      setImportLoading(false);
    }
  };

  // 倒计时
  useEffect(() => {
    if (phase !== 'exam') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          submitExam(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startExam = async (templateId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await examService.createExam({ userId, templateId });
      const created = res.data;
      setExam(created);
      setAnswers({});
      setSummary(null);
      setNewBadges([]);
      setSecondsLeft(created.template.duration * 60);
      setPhase('exam');
      window.scrollTo(0, 0);
    } catch (e: any) {
      setError(e?.error?.message || '创建模考失败');
    } finally {
      setLoading(false);
    }
  };

  const submitExam = async (auto = false) => {
    if (!exam) return;
    if (!auto && !window.confirm(`确定交卷吗？还有 ${Math.ceil(secondsLeft / 60)} 分钟。`)) return;
    setLoading(true);
    setError('');
    try {
      const payload: AnswerEntry[] = exam.questions.map((eq) => ({
        questionId: eq.question.id,
        userAnswer: answers[eq.question.id] || '',
      }));
      const res = await examService.submitExam(exam.id, payload);
      setExam(res.data);
      setSummary(res.summary || null);
      setNewBadges(res.newAchievements || []);
      setPhase('result');
      window.scrollTo(0, 0);

      // 记录学习时长（整场模考用时）
      const elapsed = Math.round(exam.template.duration * 60 - secondsLeft);
      if (elapsed >= 10) {
        studySessionService
          .record({ userId, subjectId: exam.template.subjectId, duration: elapsed })
          .catch(() => undefined);
      }
    } catch (e: any) {
      setError(e?.error?.message || '交卷失败');
    } finally {
      setLoading(false);
    }
  };

  const backToList = () => {
    setPhase('list');
    setExam(null);
    setSummary(null);
    setNewBadges([]);
    if (userId) examService.getExams(userId).then((r) => setHistory(r.data)).catch(() => undefined);
  };

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  // ========== 列表阶段 ==========
  if (phase === 'list') {
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">🏁 全真模考</h2>
          <div className="flex gap-2">
            <button className="btn-outline text-sm" onClick={() => setImportOpen(true)}>
              <Sparkles size={14} /> 导入历年真题
            </button>
            <button className="btn-outline text-sm" onClick={() => navigate('/practice')}>
              <RotateCcw size={14} /> 专项练习
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}

        {/* 导入历年真题面板 */}
        {importOpen && (
          <div className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">📥 导入历年真题（AI 解析）</div>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setImportOpen(false)}><XCircle size={18} /></button>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">
              把真题试卷的<b>题目+答案</b>文本粘贴到下方（支持从网页/PDF 复制），AI 会解析成标准题目并生成对应真题卷。导入的题会永久加入题库，其他人也能用到。
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">科目</label>
                <select className="input" value={importSubjectId} onChange={(e) => setImportSubjectId(e.target.value)}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">年份（可选）</label>
                <input className="input" placeholder="如 2025" value={importYear} onChange={(e) => setImportYear(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">试卷名（可选）</label>
                <input className="input" placeholder="留空自动命名" value={importPaperName} onChange={(e) => setImportPaperName(e.target.value)} />
              </div>
            </div>
            <textarea
              className="input min-h-[180px] font-mono text-xs"
              placeholder={'粘贴真题文本，例如：\n一、单项选择（共15小题，每小题2分）\n1. —Do you know ______ girl over there?\n   A. a  B. an  C. the  D. /\n答案：C\n...'}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            {importMsg && <div className="text-xs text-gray-500">{importMsg}</div>}
            <button className="btn-primary w-full" disabled={importLoading} onClick={doImport}>
              {importLoading ? 'AI 解析中（约20秒）…' : '✨ AI 解析并导入'}
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="card flex flex-col p-5">
              <div className="mb-1 text-lg font-bold">{t.subject.name}</div>
              <div className="text-sm font-medium text-primary">{t.name}</div>
              <p className="mt-1 flex-1 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Flag size={12} /> 总分 {t.totalScore}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {t.duration} 分钟</span>
              </div>
              {t.coverage && t.coverage.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.coverage.map((c) => {
                    const ok = c.available === null || c.available >= c.need;
                    return (
                      <span
                        key={c.name}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          ok ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                        title={`需要 ${c.need} 题，题库现有 ${c.available ?? '—'} 题`}
                      >
                        {c.name} {ok ? `✓${c.available}/${c.need}` : `${c.available ?? 0}/${c.need}`}
                      </span>
                    );
                  })}
                </div>
              )}
              <button
                className="btn-primary mt-3 w-full"
                disabled={loading}
                onClick={() => startExam(t.id)}
              >
                {loading ? '组卷中…' : '开始模考'}
              </button>
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold">📜 模考记录</div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.slice(0, 8).map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{h.template.subject.name}</span>
                    <span className="text-xs text-gray-400">{fmtDate(h.createdAt)}</span>
                  </div>
                  {h.status === 'completed' ? (
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <CheckCircle2 size={14} /> {h.score} 分
                    </span>
                  ) : (
                    <span className="chip bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">未完成</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== 答题阶段 ==========
  if (phase === 'exam' && exam) {
    const answeredCount = exam.questions.filter((eq) => (answers[eq.question.id] || '').trim() !== '').length;
    const qs: Question[] = exam.questions.map((eq) => eq.question);

    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24 sm:p-6">
        <div className="card sticky top-2 z-10 flex items-center justify-between p-3 shadow">
          <div className="font-semibold">{exam.template.subject.name} · {exam.template.name}</div>
          <div className={`flex items-center gap-1 font-mono text-lg font-bold ${secondsLeft < 300 ? 'text-error' : 'text-primary'}`}>
            <Clock size={16} /> {mmss}
          </div>
        </div>

        {exam.missingSections && exam.missingSections.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300">
            ⚠️ 题库不足，本卷已自动跳过：{exam.missingSections.join('、')}。可到「专项练习 → AI 出题」生成对应题型补全后重新组卷。
          </div>
        )}

        {exam.questions.map((eq, i) => {
          const q = eq.question;
          const ua = answers[q.id] || '';
          return (
            <div key={eq.id} className={`card p-4 ${ua.trim() ? 'border-l-4 border-l-primary' : ''}`}>
              <div className="mb-2 flex items-center gap-2">
                <span className="chip bg-primary/10 text-primary">第 {i + 1} 题 · {eq.score} 分</span>
                <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">{questionTypeLabel(q.type)}</span>
                {q.section && <span className="chip bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">{q.section}</span>}
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{q.stem}</div>

              {q.type === 'choice' ? (
                <div className="mt-3 space-y-1.5">
                  {q.options?.map((opt: string) => {
                    const letter = opt.split('.')[0].trim();
                    const active = ua === letter;
                    return (
                      <button
                        key={letter}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: letter }))}
                        className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={ua}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder={q.type === 'essay' ? '输入你的作答…' : '输入答案…'}
                  rows={q.type === 'essay' ? 5 : 2}
                  className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
                />
              )}
            </div>
          );
        })}

        <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="text-xs text-gray-500">已答 {answeredCount}/{qs.length} 题</div>
            <button className="btn-primary flex-1" disabled={loading} onClick={() => submitExam(false)}>
              <Flag size={15} /> 交卷
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== 成绩阶段 ==========
  if (phase === 'result' && exam) {
    const totalScore = exam.template.totalScore || 0;
    const score = exam.score ?? 0;
    const acc = summary?.accuracy ?? 0;

    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="card bg-gradient-to-br from-primary to-primary-dark p-6 text-center text-white">
          <div className="text-xs opacity-80">{exam.template.name}</div>
          <div className="mt-2 text-5xl font-black">{score}<span className="text-lg opacity-80"> / {totalScore}</span></div>
          <div className="mt-2 text-sm opacity-90">
            答对 {summary?.correct ?? 0} / {summary?.total ?? 0} 题 · 正确率 {acc}%
          </div>
        </div>

        {newBadges.length > 0 && (
          <div className="card border-accent/40 bg-accent/5 p-4">
            <div className="mb-1.5 text-sm font-semibold text-accent">🏅 新成就解锁</div>
            <div className="flex flex-wrap gap-2">
              {newBadges.map((b) => (
                <span key={b.name} className="chip border border-accent/50 bg-accent/10 text-accent">{b.icon} {b.name}</span>
              ))}
            </div>
          </div>
        )}

        {exam.questions.map((eq, i) => {
          const q = eq.question;
          const solution = q.solution as any;
          const analysis = solution?.analysis || '';
          return (
            <div key={eq.id} className={`card p-4 ${eq.isCorrect ? '' : 'border-l-4 border-l-error'}`}>
              <div className="mb-2 flex items-center gap-2">
                {eq.isCorrect ? <CheckCircle2 size={18} className="text-primary" /> : <XCircle size={18} className="text-error" />}
                <span className="text-sm font-medium">第 {i + 1} 题 · {eq.score} 分</span>
                {eq.isCorrect === false && (
                  <span className="ml-auto text-xs font-bold text-error">-{eq.score || 0} 分</span>
                )}
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{q.stem}</div>
              {!eq.isCorrect && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-red-500">正确答案：</span><span className="font-mono">{q.answer}</span>
                  {eq.userAnswer && <div className="mt-0.5"><span className="text-gray-400">你的答案：</span><span className="font-mono">{eq.userAnswer}</span></div>}
                </div>
              )}
              {analysis && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <div className="mb-1 font-semibold text-gray-500">📖 解析</div>
                  <div className="whitespace-pre-wrap leading-relaxed">{analysis}</div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={backToList}>
            <RotateCcw size={16} /> 返回模考列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-10 text-sm text-gray-400">
      <AlertTriangle size={16} className="mr-2" /> 加载中…
    </div>
  );
}
