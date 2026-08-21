import { useEffect, useRef, useState } from 'react';
import { BookMarked, Bot, Lightbulb, MessageSquare, PencilLine, Send, Sparkles, Trash2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { aiService } from '@/services/aiService';
import { essayService } from '@/services/essayService';
import { subjectService } from '@/services/subjectService';
import { knowledgeService } from '@/services/knowledgeService';
import { questionService } from '@/services/questionService';
import type { AISolution, Essay, KnowledgePoint, Question, Subject } from '@/types';

type Tab = 'tutor' | 'explain' | 'essay' | 'chat';

interface ChatMsg {
  role: 'user' | 'ai';
  content: string;
}

export default function AIPage() {
  const { userId, user } = useUser();
  const isUndergrad = user?.examMode === 'undergraduate';
  const [tab, setTab] = useState<Tab>('explain');

  // 解题助手
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionId, setQuestionId] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [solution, setSolution] = useState<AISolution | null>(null);
  const [solving, setSolving] = useState(false);

  // 知识点讲解
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [pointId, setPointId] = useState('');
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  // 作文批改
  const [essay, setEssay] = useState('');
  const [review, setReview] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [essayTitle, setEssayTitle] = useState('');
  const [essaySubjectId, setEssaySubjectId] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // 自由问答
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatting, setChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      knowledgeService.getKnowledge(),
      questionService.getQuestions({ limit: 100 }),
      subjectService.getSubjects(),
    ])
      .then(([kpRes, qRes, subRes]) => {
        const pts = kpRes.data.filter((p) => p.level === 2);
        setPoints(pts);
        if (pts.length > 0) setPointId(pts[0].id);
        setQuestions(qRes.data);
        if (qRes.data.length > 0) setQuestionId(qRes.data[0].id);
        const allowed = isUndergrad ? ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'] : ['Y', 'M', 'E'];
        const filteredSubjects = subRes.data.filter((s) => allowed.includes(s.code));
        setSubjects(filteredSubjects);
        if (filteredSubjects.length > 0) setEssaySubjectId(filteredSubjects[0].id);
      })
      .catch(() => undefined);
  }, [isUndergrad]);

  // 加载聊天历史 + 作文库
  useEffect(() => {
    if (!userId) return;
    aiService.getChatHistory(userId).then((r) => {
      if (r.data.length > 0) setMessages(r.data as ChatMsg[]);
    }).catch(() => undefined);
    essayService.getEssays(userId).then((r) => setEssays(r.data)).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const solve = async () => {
    if (!questionId) return;
    setSolving(true);
    setSolution(null);
    try {
      const res = await aiService.solveQuestion(questionId, myAnswer);
      setSolution(res.data);
    } catch (e: any) {
      setSolution({ isCorrect: false, explanation: '分析失败，请稍后重试。', stepByStep: [], tips: '', relatedKnowledge: [] });
    } finally {
      setSolving(false);
    }
  };

  const explain = async () => {
    if (!pointId) return;
    setExplaining(true);
    setExplanation('');
    try {
      const res = await aiService.explainKnowledge(pointId);
      setExplanation(res.data.explanation || '暂无讲解内容。');
    } catch (e: any) {
      setExplanation('讲解生成失败，请稍后重试。');
    } finally {
      setExplaining(false);
    }
  };

  const doReview = async () => {
    if (!essay.trim()) return;
    setReviewing(true);
    setReview('');
    try {
      const res = await aiService.reviewEssay(essay);
      const r = res.data;
      const lines = [
        `**评分：${r.score}/60**`,
        '',
        `**总评**：${r.comment}`,
        '',
        '**优点**',
        ...r.strengths.map((s) => `- ${s}`),
        '',
        '**不足**',
        ...r.weaknesses.map((s) => `- ${s}`),
        '',
        '**改进建议**',
        ...r.suggestions.map((s) => `- ${s}`),
      ];
      setReview(lines.join('\n'));
    } catch (e: any) {
      setReview('批改失败，请稍后重试。');
    } finally {
      setReviewing(false);
    }
  };

  const saveEssay = async () => {
    if (!essay.trim()) return;
    setReviewing(true);
    setReview('');
    try {
      const res = await essayService.create({
        userId: userId || '',
        subjectId: essaySubjectId,
        title: essayTitle || '未命名作文',
        content: essay,
        type: 'argument',
      });
      const r = res.data.review;
      setReview([
        `**评分：${r.score}/60**（已存入作文库）`,
        '',
        `**总评**：${r.comment}`,
        '',
        '**优点**',
        ...r.strengths.map((x) => `- ${x}`),
        '',
        '**不足**',
        ...r.weaknesses.map((x) => `- ${x}`),
        '',
        '**改进建议**',
        ...r.suggestions.map((x) => `- ${x}`),
      ].join('\n'));
      const list = await essayService.getEssays(userId || '');
      setEssays(list.data);
    } catch (e: any) {
      setReview('保存或批改失败，请稍后重试。');
    } finally {
      setReviewing(false);
    }
  };

  const removeEssay = async (id: string) => {
    if (!window.confirm('确定删除这篇作文？')) return;
    await essayService.remove(id);
    const list = await essayService.getEssays(userId || '');
    setEssays(list.data);
  };

  const sendChat = async () => {
    const q = question.trim();
    if (!q || chatting) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setQuestion('');
    setChatting(true);
    try {
      const res = await aiService.chat(q, userId);
      setMessages((m) => [...m, { role: 'ai', content: res.data.answer }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'ai', content: '（回答失败，请稍后重试）' }]);
    } finally {
      setChatting(false);
    }
  };

  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ['tutor', '解题助手', <Lightbulb key="t" size={14} />],
    ['explain', '知识点讲解', <Sparkles key="e" size={14} />],
    ['essay', '作文批改', <PencilLine key="w" size={14} />],
    ['chat', '自由问答', <MessageSquare key="c" size={14} />],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
          <Bot size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">AI 辅导</h2>
          <p className="text-xs text-gray-400">解题 · 批改 · 问答（演示模式）</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
              tab === key ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'tutor' && (
        <div className="card space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">选择题目（从题库随机一组）</label>
            <select
              value={questionId}
              onChange={(e) => { setQuestionId(e.target.value); setSolution(null); }}
              className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>[{q.subject?.name || ''}] {q.stem.slice(0, 40)}{q.stem.length > 40 ? '…' : ''}</option>
              ))}
            </select>
          </div>
          {questions.find((q) => q.id === questionId) && (
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {questions.find((q) => q.id === questionId)!.stem}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">我的答案</label>
            <input
              value={myAnswer}
              onChange={(e) => setMyAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && solve()}
              placeholder="输入你的答案（选择题填选项字母）…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <button className="btn-primary w-full" disabled={solving || !questionId} onClick={solve}>
            <Lightbulb size={15} /> {solving ? '分析中…' : 'AI 解题分析'}
          </button>
          {solution && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${solution.isCorrect ? 'text-primary' : 'text-error'}`}>
                {solution.isCorrect ? '✅ 答对了！' : '❌ 答错了'}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200">{solution.explanation}</div>
              {solution.stepByStep.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold text-gray-500">解题步骤</div>
                  <div className="space-y-1">
                    {solution.stepByStep.map((step, i) => (
                      <div key={i} className="text-sm text-gray-600 dark:text-gray-300">{step}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">💡 {solution.tips}</div>
              {solution.relatedKnowledge.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {solution.relatedKnowledge.map((k) => (
                    <span key={k} className="chip bg-primary/10 text-primary">{k}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'explain' && (
        <div className="card space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">选择考点</label>
            <select
              value={pointId}
              onChange={(e) => setPointId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            >
              {points.map((p) => (
                <option key={p.id} value={p.id}>{p.code} {p.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary w-full" disabled={explaining || !pointId} onClick={explain}>
            <Sparkles size={15} /> {explaining ? '生成中…' : '开始讲解'}
          </button>
          {explanation && (
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {explanation}
            </div>
          )}
        </div>
      )}

      {tab === 'essay' && (
        <div className="card space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">粘贴你的作文</label>
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              rows={8}
              placeholder="输入作文全文，AI 将从立意、结构、语言、内容、卷面等维度批改…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={essayTitle} onChange={(e) => setEssayTitle(e.target.value)} placeholder="作文标题（可选）" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800" />
            <select value={essaySubjectId} onChange={(e) => setEssaySubjectId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800">
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={reviewing || !essay.trim()} onClick={doReview}>
              <PencilLine size={15} /> {reviewing ? '批改中…' : 'AI 批改'}
            </button>
            <button className="btn-outline" disabled={reviewing || !essay.trim()} onClick={saveEssay}>
              <BookMarked size={15} /> 保存到作文库
            </button>
          </div>
          {review && (
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {review}
            </div>
          )}

          {essays.length > 0 && (
            <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="mb-2 text-sm font-semibold">🗂 我的作文库（{essays.length}）</div>
              <div className="space-y-2">
                {essays.map((e) => (
                  <div key={e.id} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.title}</span>
                      {e.reviews?.[0] && (
                        <span className="chip bg-primary/10 text-primary">{e.reviews[0].score} 分</span>
                      )}
                      <span className="text-xs text-gray-400">{e.content.slice(0, 20)}…</span>
                      <button className="ml-auto text-gray-300 hover:text-error" onClick={() => removeEssay(e.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="card flex h-[60vh] flex-col p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-400">
                <Bot size={36} className="opacity-40" />
                <div>我是你的学习助手，可以问我任何问题</div>
                <div className="text-xs opacity-70">试试：「这道题怎么解？」「帮我解释这个知识点」</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatting && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 text-sm text-gray-400 dark:bg-gray-800">
                  思考中…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="输入问题，回车发送…"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
            />
            <button className="btn-primary px-3.5" disabled={chatting || !question.trim()} onClick={sendChat}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
