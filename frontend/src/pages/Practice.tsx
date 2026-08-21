import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eraser, PenLine, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { subjectService } from '@/services/subjectService';
import { knowledgeService } from '@/services/knowledgeService';
import { questionService } from '@/services/questionService';
import { exerciseService } from '@/services/exerciseService';
import { studySessionService } from '@/services/studySessionService';
import { aiService } from '@/services/aiService';
import { wrongQuestionService } from '@/services/wrongQuestionService';
import { questionTypeLabel } from '@/utils/date';
import { normalizeQuestionOptions } from '@/utils/question';
import type { AISolution, KnowledgePoint, Question, Subject } from '@/types';

type Phase = 'config' | 'answering' | 'result';
type Mode = 'smart' | 'knowledge' | 'wrong' | 'ai';

interface ResultItem {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
}

export default function Practice() {
  const { userId, user } = useUser();
  const [searchParams] = useSearchParams();


  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [knowledgeId, setKnowledgeId] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('all');
  const [questionType, setQuestionType] = useState('all');
  const [section, setSection] = useState(searchParams.get('section') || 'all');
  const [mode, setMode] = useState<Mode>('smart');
  const [aiType, setAiType] = useState<'choice' | 'fill' | 'essay'>('choice');

  const [phase, setPhase] = useState<Phase>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ResultItem[] | null>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiPanel, setAiPanel] = useState<{ questionId: string; solution: AISolution | null; loading: boolean } | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return; // 等待用户信息加载完成
    const isUndergrad = user.examMode === 'undergraduate';

    Promise.allSettled([
      subjectService.getSubjects(),
      knowledgeService.getKnowledge(),
    ]).then(([subsResult, kpResult]) => {
      // 处理科目列表
      if (subsResult.status === 'fulfilled') {
        const subs = subsResult.value.data || [];
        const filtered = isUndergrad
          ? subs.filter(s => ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'].includes(s.code))
          : subs.filter(s => ['Y', 'M', 'E'].includes(s.code));
        setSubjects(filtered);
        if (filtered.length > 0 && !subjectId) setSubjectId(filtered[0].id);
      } else {
      }

      // 处理知识点列表
      if (kpResult.status === 'fulfilled') {
        const pts = (kpResult.value.data || []).filter((p) => p.level === 2);
        setPoints(pts);
      }

      // 从知识页「专项练习」进入
      const kpId = searchParams.get('knowledge');
      if (kpId) {
        const allKps = (kpResult.status === 'fulfilled' ? kpResult.value.data : points);
        const kp = (allKps || []).find((p) => p.id === kpId);
        if (kp) {
          setSubjectId(kp.chapter.subjectId);
          setKnowledgeId(kpId);
          setMode('knowledge');
          setTimeout(() => start('knowledge', kpId, kp.chapter.subjectId), 0);
        }
        return;
      }
      // 从错题本「一键重练」进入
      if (searchParams.get('mode') === 'wrong') {
        setMode('wrong');
        setTimeout(() => start('wrong'), 0);
      }
    }).catch(() => {
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const pointsOfSubject = useMemo(
    () => points.filter((p) => p.chapter.subjectId === subjectId),
    [points, subjectId]
  );

  const start = async (m?: Mode, kpId?: string, subjId?: string) => {
    const useMode = m || mode;
    const useKp = kpId || knowledgeId;
    const useSubj = subjId || subjectId;
    setLoading(true);
    setError('');

    // 验证必填参数
    if (!useSubj) {
      setError('请先选择科目');
      setLoading(false);
      return;
    }
    if (!userId) {
      setError('请先登录');
      setLoading(false);
      return;
    }


    try {
      let list: Question[] = [];
      if (useMode === 'wrong') {
        const wrongRes = await wrongQuestionService.getWrongQuestions({ userId, mastered: false, limit: 50 });
        list = wrongRes.data.filter((w) => w.question && (w.question.status !== 'archived')).map((w) => w.question);
      } else if (useMode === 'smart') {
        // 智能组卷：薄弱考点加权
        const genRes = await exerciseService.generatePaper({
          userId,
          subjectId: useSubj,
          count,
          ...(difficulty !== 'all' ? { difficulty } : {}),
        });
        list = genRes.data.questions || [];
      } else {
        const qRes = await questionService.getQuestions({
          subjectId: useSubj,
          ...(useMode === 'knowledge' && useKp ? { knowledgePointId: useKp } : {}),
          ...(questionType !== 'all' ? { type: questionType } : {}),
          ...(section !== 'all' ? { section } : {}),
          limit: 100,
        });
        list = qRes.data || [];
      }

      // 难度过滤（智能组卷已过滤；其余模式兜底）
      if (difficulty !== 'all' && useMode !== 'smart') {
        const [lo, hi] = difficulty.split('-').map(Number);
        list = list.filter((q) => hi ? q.difficulty >= lo && q.difficulty <= hi : q.difficulty === lo);
      }
      list = [...list].sort(() => Math.random() - 0.5).slice(0, count);

      if (list.length === 0) {
        setError('该条件下暂无题目，请尝试其他模式或更换筛选条件');
        return;
      }
      setQuestions(list);
      setAnswers({});
      setCurrent(0);
      setResult(null);
      setAiSummary('');
      setNewBadges([]);
      startTimeRef.current = Date.now();
      setPhase('answering');
    } catch (e: any) {
      setError(e?.error?.message || '加载题目失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  // AI 出题：现场命制新题并开始练习
  const startAI = async () => {
    if (!subjectId) {
      setError('请先选择科目');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await aiService.generateQuestions({
        subjectId,
        ...(knowledgeId ? { knowledgePointId: knowledgeId } : {}),
        type: aiType,
        count,
      });
      const list: Question[] = res.data.questions || [];
      if (list.length === 0) {
        setError('AI 未生成题目，请重试');
        return;
      }
      setQuestions(list);
      setAnswers({});
      setCurrent(0);
      setResult(null);
      setAiSummary('');
      setNewBadges([]);
      startTimeRef.current = Date.now();
      setPhase('answering');
    } catch (e: any) {
      setError(
        e?.error?.message ||
          (e?.response?.status === 504
            ? 'AI 出题超时，请减少题量（建议 3 题以内）后重试'
            : 'AI 出题失败，请稍后再试')
      );
    } finally {
      setLoading(false);
    }
  };

  // 问 AI：调解题助手
  const askAI = async (questionId: string) => {    setAiPanel({ questionId, solution: null, loading: true });
    try {
      const res = await aiService.solveQuestion(questionId, answers[questionId] || '');
      setAiPanel({ questionId, solution: res.data, loading: false });
    } catch {
      setAiPanel({ questionId, solution: null, loading: false });
    }
  };

  // 判分：选择题比对选项字母；其他题型做归一化比对
  const grade = (q: Question, userAnswer: string): boolean => {
    const ua = (userAnswer || '').trim().toLowerCase();
    const ans = (q.answer || '').trim().toLowerCase();
    if (!ua) return false;
    if (q.type === 'choice') return ua === ans;
    // 五选五/填空：去掉空格与标点后比对
    const norm = (s: string) => s.replace(/[\s，。、；：,.!?；'"“”]/g, '');
    return norm(ua) === norm(ans);
  };

  const submit = async () => {
    setLoading(true);
    let items: ResultItem[] = [];
    try {
      items = questions.map((q) => {
        const userAnswer = answers[q.id] || '';
        const isCorrect = grade(q, userAnswer);
        return { question: q, userAnswer, isCorrect };
      });
      const res = await exerciseService.createExercise({
        userId,
        subjectId: questions[0].subjectId,
        questions: items.map((it) => ({
          id: it.question.id,
          userAnswer: it.userAnswer,
          isCorrect: it.isCorrect,
          wrongReason: it.isCorrect ? undefined : '练习判分',
          timeSpent: 0,
        })),
      });
      // 用后端返回的判分结果刷新（含题库答案展示）
      const eqs = res.data.exerciseQuestions || [];
      const finalItems = eqs.map((eq) => ({
        question: eq.question,
        userAnswer: eq.userAnswer || '',
        isCorrect: !!eq.isCorrect,
      }));
      setResult(finalItems.length > 0 ? finalItems : items);
      setAiSummary(res.data.aiSummary || '');
      setNewBadges((res.newAchievements || []).map((a) => a.name));
      setPhase('result');

      // 记录学习时长
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (elapsed >= 10) {
        studySessionService
          .record({ userId, subjectId: questions[0].subjectId, duration: elapsed })
          .catch(() => undefined);
      }
    } catch (e: any) {
      // API 失败时仍显示本地判分结果，避免用户看不到评分
      setError(e?.error?.message || '提交失败（已显示本地判分结果）');
      // 使用本地计算的 items 作为结果
      setResult(items);
      setPhase('result');
    } finally {
      setLoading(false);
    }
  };

  const q = questions[current];
  const answeredCount = questions.filter((x) => (answers[x.id] || '').trim() !== '').length;

  const resetConfig = () => { setPhase('config'); setResult(null); setQuestions([]); setAiSummary(''); setNewBadges([]); };

  // ========== 配置阶段 ==========
  if (phase === 'config') {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
        <h2 className="text-xl font-bold">✏️ 智能练习</h2>
        <div className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">练习模式</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([['smart', '🎯 智能组卷'], ['knowledge', '📌 按考点'], ['wrong', '🧹 错题重练'], ['ai', '✨ AI 出题']] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {mode === 'smart' && '从题库随机抽题，覆盖该科目各章节'}
              {mode === 'knowledge' && '指定单一考点专项训练'}
              {mode === 'wrong' && '从错题本抽取未消化错题重练'}
              {mode === 'ai' && 'AI 现场命制新题并存入题库，越练题库越大'}
            </p>
          </div>

          {mode !== 'wrong' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">科目</label>
              <div className="flex gap-2">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSubjectId(s.id); setKnowledgeId(''); }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      subjectId === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mode === 'knowledge' || mode === 'ai') && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">知识点</label>
              <select className="input" value={knowledgeId} onChange={(e) => setKnowledgeId(e.target.value)}>
                <option value="">全部考点（综合）</option>
                {pointsOfSubject.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} {p.name}（{p.mastery < 40 && p.status !== 'mastered' ? '需强化' : p.status === 'mastered' ? '已掌握' : '未学'}）
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'ai' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">题型</label>
              <div className="flex gap-2">
                {([['choice', '选择题'], ['fill', '填空题'], ['essay', '解答题']] as const).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => setAiType(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      aiType === t ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user?.examMode === 'undergraduate' && mode !== 'ai' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">题型</label><select className="input" value={questionType} onChange={(e) => setQuestionType(e.target.value)}><option value="all">全部题型</option><option value="choice">选择题</option><option value="fill">填空 / 名词解释</option><option value="essay">简答 / 论述 / 案例分析</option><option value="listening">听力题</option></select></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">题型分区</label><input className="input" placeholder="如：民法总论、案例分析、Reading" value={section === 'all' ? '' : section} onChange={(e) => setSection(e.target.value || 'all')} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4" style={{ marginTop: user?.examMode === 'undergraduate' && mode !== 'ai' ? 12 : 0 }}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">题量</label>
              <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {(mode === 'ai' ? [1, 2, 3, 5] : [5, 10, 15, 20]).map((n) => <option key={n} value={n}>{n} 题</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">难度</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="all">全部难度</option>
                <option value="1-2">基础 ★~★★</option>
                <option value="3">中档 ★★★</option>
                <option value="4-5">挑战 ★★★★~★★★★★</option>
              </select>
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

          <button className="btn-primary w-full py-3" onClick={() => (mode === 'ai' ? startAI() : start())} disabled={loading}>
            {loading ? '生成中…' : mode === 'ai' ? '✨ AI 出题并开始练习' : '🚀 开始练习'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400">
          {mode === 'ai' ? '提示：AI 生成的新题会存入题库，练习后自动判分、收录错题' : '提示：练习完成后自动判分、收录错题、更新掌握度'}
        </p>
      </div>
    );
  }

  // ========== 答题阶段 ==========
  if (phase === 'answering' && q) {
    const myAnswer = answers[q.id] || '';
    const progress = Math.round((answeredCount / questions.length) * 100);
    const options = normalizeQuestionOptions(q.options);
    // 多空五选五（答案含多个字母，如 "C A B D E"）不能按单选渲染，需走文本框
    const multiLetter = options.length > 0 && /\s/.test(String(q.answer || '').trim()) && /^[A-E]+(\s+[A-E]+)+$/i.test(String(q.answer || '').trim());
    const isObj = q.type === 'choice' || (options.length > 0 && !multiLetter);

    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">第 {current + 1} 题 / 共 {questions.length} 题</h2>
          <button className="btn-outline text-sm" onClick={resetConfig}><ArrowLeft size={14} /> 退出</button>
        </div>
        <div className="progress-bar">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="card p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="chip bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">{questionTypeLabel(q.type)}</span>
            <span className="chip bg-amber-100 text-amber-600 dark:bg-amber-900/40">难度 {'★'.repeat(q.difficulty)}</span>
            {q.questionKnowledge?.slice(0, 3).map((qk) => (
              <span key={qk.knowledgePoint.id} className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                {qk.knowledgePoint.code}
              </span>
            ))}
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</div>

          {isObj && options.length > 0 && (
            <div className="mt-4 space-y-2">
              {options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const selected = myAnswer === letter;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                    }`}>
                      {letter}
                    </span>
                    <span className="whitespace-pre-wrap">{opt.replace(/^[A-E][.、]\s*/, '')}</span>
                  </button>
                );
              })}
            </div>
          )}
          {!isObj && (
            <textarea
              className="input mt-4 min-h-[120px]"
              placeholder="在此输入你的答案（解答题可写关键步骤；五选五请按顺序填入选项字母，如：C A B D E）"
              value={myAnswer}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          )}
        </div>

        {/* 问 AI 面板 */}
        {aiPanel?.questionId === q.id && (
          <div className="card border-accent/40 bg-accent/5 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-accent"><Sparkles size={14} /> AI 解题分析</div>
            {aiPanel.loading ? (
              <div className="text-sm text-gray-400">AI 分析中…</div>
            ) : aiPanel.solution ? (
              <div className="space-y-2">
                <div className={`text-sm font-semibold ${aiPanel.solution.isCorrect ? 'text-primary' : 'text-error'}`}>
                  {aiPanel.solution.isCorrect ? '✅ 这题答对了！' : '❌ 这题答错了'}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">{aiPanel.solution.explanation}</div>
                {aiPanel.solution.stepByStep.length > 0 && (
                  <div className="space-y-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {aiPanel.solution.stepByStep.map((st, si) => <div key={si}>{st}</div>)}
                  </div>
                )}
                {aiPanel.solution.referenceAnswer && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/50 dark:bg-emerald-900/20">
                    <div className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">📝 完整参考答案</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200">{aiPanel.solution.referenceAnswer}</div>
                  </div>
                )}
                {aiPanel.solution.relatedKnowledge.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {aiPanel.solution.relatedKnowledge.map((k) => (
                      <span key={k} className="chip bg-primary/10 text-primary">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-error">AI 分析失败，请稍后再试</div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <button className="btn-outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
            <ArrowLeft size={16} /> 上一题
          </button>
          <button className="btn-outline" onClick={() => askAI(q.id)} title="AI 解题分析（演示模式）">
            <Sparkles size={15} /> 问 AI
          </button>
          {current < questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setCurrent(current + 1)}>
              下一题 <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn-accent" onClick={submit} disabled={loading}>
              {loading ? '提交判分中…' : `交卷（已答 ${answeredCount}/${questions.length}）`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========== 结算阶段 ==========
  if (phase === 'result' && result) {
    const correct = result.filter((r) => r.isCorrect).length;
    const accuracy = result.length ? Math.round((correct / result.length) * 100) : 0;

    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="card bg-ink p-6 text-center text-white">
          <div className="bauhaus-stripe mb-3 -mx-6"><span /><span /><span /></div>
          <div className="text-4xl font-black">{accuracy}%</div>
          <div className="mt-1 text-sm opacity-90">答对 {correct} / {result.length} 题</div>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles size={16} className="text-accent" /> AI 小结
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {aiSummary ||
              (accuracy >= 80
                ? '太棒了！本组练习正确率很高，继续保持。错题已自动收录到错题本，建议隔天重练巩固。'
                : accuracy >= 50
                  ? '不错！本组练习基本达标。建议把错题对应的考点加入专项练习，逐个击破。'
                  : '别灰心，错误是最好的老师。建议先回到「学习」页复习薄弱考点，再回来挑战！')}
          </p>
        </div>

        {newBadges.length > 0 && (
          <div className="card border-accent/40 bg-accent/5 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-accent">
              🏅 新成就解锁
            </div>
            <div className="flex flex-wrap gap-2">
              {newBadges.map((name) => (
                <span key={name} className="chip border border-accent/50 bg-accent/10 text-accent">{name}</span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {result.map((r, i) => {
            const solution = r.question.solution as any;
            const analysis = solution?.analysis || '';
            return (
              <div key={i} className={`card p-4 ${r.isCorrect ? '' : 'border-l-4 border-l-error'}`}>
                <div className="mb-2 flex items-center gap-2">
                  {r.isCorrect ? <CheckCircle2 size={18} className="text-primary" /> : <XCircle size={18} className="text-error" />}
                  <span className="text-sm font-medium">第 {i + 1} 题</span>
                  <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">{questionTypeLabel(r.question.type)}</span>
                  {r.question.questionKnowledge?.[0] && (
                    <span className="chip bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      {r.question.questionKnowledge[0].knowledgePoint.code} {r.question.questionKnowledge[0].knowledgePoint.name}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{r.question.stem}</div>
                {!r.isCorrect && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-red-500">正确答案：</span>
                    <span className="font-mono">{r.question.answer}</span>
                    {r.userAnswer && <div className="mt-0.5"><span className="text-gray-400">你的答案：</span><span className="font-mono">{r.userAnswer}</span></div>}
                  </div>
                )}
                {analysis && (
                  <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <div className="mb-1 font-semibold text-gray-500">📖 解析</div>
                    <div className="whitespace-pre-wrap leading-relaxed">{analysis}</div>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <button
                    className="text-xs text-gray-400 underline-offset-2 hover:text-amber-600 hover:underline"
                    onClick={() => {
                      const reason = window.prompt('你觉得这题哪里有问题？（如：答案有误 / 选项重复 / 题干不清）');
                      if (reason) {
                        questionService.submitFeedback(r.question.id, reason)
                          .then(() => window.alert('✅ 已提交反馈，感谢纠错！我们会尽快复核修正。'))
                          .catch(() => window.alert('反馈提交失败，请稍后重试'));
                      }
                    }}
                  >
                    ⚠️ 题目有误？反馈纠错
                  </button>
                  <span className="text-[11px] text-gray-300 dark:text-gray-600">AI 生成题，答案如有疑问可反馈</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={resetConfig}><RefreshCw size={16} /> 再来一组</button>
          <button className="btn-outline" onClick={() => { setPhase('answering'); setCurrent(0); }}>
            <PenLine size={16} /> 查看题目
          </button>
          <button className="btn-outline" onClick={() => { setMode('wrong'); resetConfig(); }}>
            <Eraser size={16} /> 去错题本
          </button>
        </div>
      </div>
    );
  }

  return null;
}
