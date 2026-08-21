import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, RotateCcw, Sparkles, Target, Zap } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { subjectService } from '@/services/subjectService';
import { questionService } from '@/services/questionService';
import { StudyReward } from '@/components/StudyReward';
import { normalizeQuestionOptions } from '@/utils/question';
import type { Question, Subject } from '@/types';

type SubjectCode = 'Y' | 'E';
type MicroMode = 'chinese-classics' | 'chinese-grammar' | 'english-grammar' | 'english-cloze';
const MODES: Array<{ key: MicroMode; subject: SubjectCode; title: string; desc: string; icon: string; keywords: string[] }> = [
  { key: 'chinese-classics', subject: 'Y', title: '古诗文理解', desc: '词义、翻译、主旨、名句识别', icon: '📜', keywords: ['古诗', '诗歌', '文言', '名句', '翻译'] },
  { key: 'chinese-grammar', subject: 'Y', title: '文言句法修辞', desc: '虚词、句式、用词、修辞辨析', icon: '🖋️', keywords: ['文言', '句式', '修辞', '实词', '虚词', '词类'] },
  { key: 'english-grammar', subject: 'E', title: '英语语法时态', desc: '语态、时态、过去式、语法选择', icon: '🔤', keywords: ['语法', '时态', '语态', '过去式', '被动'] },
  { key: 'english-cloze', subject: 'E', title: '完形填空线索', desc: '词义、搭配、逻辑、上下文判断', icon: '🧩', keywords: ['完形', 'cloze', '词汇', '搭配'] },
];
function norm(value: unknown) { return String(value || '').trim().toLowerCase().replace(/[\s，。、“”‘’'".,!?;；:：]/g, ''); }
function analysis(q: Question) { return (q.solution as any)?.analysis || '先找题干关键词，再结合上下文、语法和固定搭配判断。答完后请用一句话说出自己的判断依据。'; }

export default function MicroLearn() {
  useUser();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mode, setMode] = useState<MicroMode>('chinese-classics');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reward, setReward] = useState<{ title: string; message: string; icon: string } | null>(null);
  const active = MODES.find((item) => item.key === mode)!;
  const question = questions[current];
  const options = question ? normalizeQuestionOptions(question.options) : [];
  const isChoice = options.length > 0 && question?.type === 'choice';
  const correct = !!question && norm(answer) === norm(question.answer);

  useEffect(() => { subjectService.getSubjects().then((res) => setSubjects(res.data)).catch(() => setError('科目加载失败')); }, []);
  const loadQuestions = async (nextMode = mode) => {
    const target = MODES.find((item) => item.key === nextMode)!;
    const subject = subjects.find((item) => item.code === target.subject);
    if (!subject) return;
    setLoading(true); setError(''); setChecked(false); setAnswer(''); setScore(0); setCurrent(0);
    try {
      const res = await questionService.getQuestions({ subjectId: subject.id, limit: 100 });
      const all = res.data || [];
      const matched = all.filter((q) => target.keywords.some((key) => (q.section + ' ' + q.stem + ' ' + JSON.stringify(q.solution || '')).toLowerCase().includes(key.toLowerCase())));
      const list = [...(matched.length >= 3 ? matched : all)].sort(() => Math.random() - 0.5).slice(0, 5);
      if (!list.length) throw new Error('该科目暂无题目');
      setQuestions(list);
    } catch (e: any) { setQuestions([]); setError(e?.message || '暂无对应题目'); } finally { setLoading(false); }
  };
  useEffect(() => { if (subjects.length) loadQuestions(); }, [subjects.length]);
  const chooseMode = (next: MicroMode) => { setMode(next); loadQuestions(next); };
  const check = () => { if (question && answer.trim()) { setChecked(true); if (correct) setScore((value) => value + 1); } };
  const next = () => {
    if (current >= questions.length - 1) { const total = score + (correct ? 1 : 0); setReward({ title: total >= 4 ? '这一组完成得很棒！' : '完成就是进步！', message: '本组 ' + total + '/' + questions.length + '，明天再复习一次，记忆会更牢。', icon: total >= 4 ? '🏆' : '🌱' }); return; }
    setCurrent((value) => value + 1); setAnswer(''); setChecked(false);
  };
  return <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
    <StudyReward open={!!reward} title={reward?.title || ''} message={reward?.message} icon={reward?.icon} onClose={() => { setReward(null); loadQuestions(); }} />
    <div className="card p-5 sm:p-6"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Zap size={14} /> 每天 5 分钟</div><h1 className="text-2xl font-black">微学习训练</h1><p className="mt-1 text-sm text-gray-500">不背整章，只解决一个小问题。答错的题可以继续在错题本复习。</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-4">{MODES.map((item) => <button key={item.key} onClick={() => chooseMode(item.key)} className={'rounded-lg border-2 p-3 text-left transition ' + (mode === item.key ? 'border-ink bg-accent' : 'border-gray-200 hover:border-ink dark:border-gray-700')}><div className="text-2xl">{item.icon}</div><div className="mt-1 text-sm font-bold">{item.title}</div><div className="mt-1 text-xs text-gray-500">{item.desc}</div></button>)}</div>
    </div>
    {error && <div className="card p-4 text-sm text-error">{error}</div>}
    {loading ? <div className="card py-20 text-center text-gray-400">正在准备 5 分钟训练…</div> : question && <div className="card p-5 sm:p-7"><div className="mb-4 flex items-center justify-between"><span className="chip bg-primary/10 text-primary"><Target size={14} /> {active.title}</span><span className="text-sm text-gray-400">第 {current + 1}/{questions.length} 题 · 得分 {score}</span></div><div className="progress-bar mb-5"><div style={{ width: ((current + (checked ? 1 : 0)) / questions.length * 100) + '%' }} /></div><div className="mb-5 whitespace-pre-wrap text-base leading-relaxed">{question.stem}</div>{isChoice && <div className="space-y-2">{options.map((option, index) => { const letter = String.fromCharCode(65 + index); return <button key={index} onClick={() => !checked && setAnswer(letter)} className={'flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm ' + (answer === letter ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700')}><span className="font-black">{letter}.</span><span>{option.replace(/^[A-E][.、]\s*/, '')}</span></button>; })}</div>}{!isChoice && <textarea className="input min-h-[140px]" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="写下你的答案或关键词…" disabled={checked} />}{checked && <div className={'mt-5 rounded-lg border-2 p-4 ' + (correct ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-primary bg-red-50 dark:bg-red-900/20')}><div className="flex items-center gap-2 font-bold">{correct ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />} {correct ? '答对了！' : '再想一想'}</div><div className="mt-2 text-sm leading-relaxed">{correct ? analysis(question) : '正确答案：' + question.answer + '。' + analysis(question)}</div></div>}<div className="mt-6 flex justify-between gap-3"><button className="btn-outline" disabled={current === 0} onClick={() => { setCurrent((value) => value - 1); setAnswer(''); setChecked(false); }}><ArrowLeft size={16} /> 上一题</button>{!checked ? <button className="btn-primary" disabled={!answer.trim()} onClick={check}>检查答案 <Sparkles size={16} /></button> : <button className="btn-primary" onClick={next}>{current === questions.length - 1 ? '完成训练' : '下一题'} <ArrowRight size={16} /></button>}</div></div>}
    {!question && !loading && !error && <div className="card py-20 text-center text-gray-400"><BookOpen className="mx-auto mb-3" />选择一个训练主题开始。</div>}
  </div>;
}
