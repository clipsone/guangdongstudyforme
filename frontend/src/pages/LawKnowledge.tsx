import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, PenLine, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/services/api';

type LawCourse = [string, string, string[]];
const CURRICULUM: LawCourse[] = [
  ['法理学', '马克思主义法学理论与法治基本原理', ['法的本质与特征', '法律的起源与发展', '法律规范与法律体系', '法律关系与法律责任', '全面依法治国与法治中国']],
  ['宪法学', '国家根本制度与公民基本权利', ['宪法基本原理', '国家性质与根本制度', '公民基本权利和义务', '国家机构', '宪法实施与监督']],
  ['民法学', '民事主体、民事权利与民事责任', ['民法基本原则', '民事主体与民事权利', '民事法律行为与代理', '物权与合同', '侵权责任']],
  ['刑法学', '犯罪与刑罚的基本理论和制度', ['刑法基本原则', '犯罪构成', '犯罪形态与共同犯罪', '刑罚体系与裁量', '分则重点罪名']],
  ['民事诉讼法学', '民事纠纷解决与审判程序', ['民事诉讼基本原理', '管辖与当事人', '民事证据与证明', '一审、二审与再审', '执行程序']],
  ['刑事诉讼法学', '刑事追诉、辩护与审判', ['刑事诉讼基本原则', '侦查与强制措施', '辩护、代理与证据', '审判程序', '认罪认罚与特别程序']],
  ['行政法与行政诉讼法学', '行政权运行与行政救济', ['行政法基本原则', '行政主体与行政行为', '行政许可、处罚与强制', '行政复议', '行政诉讼']],
  ['经济法学', '国家调节经济与公共利益保护', ['经济法基本理论', '市场规制法', '宏观调控法', '消费者权益保护', '竞争法与金融监管']],
  ['商法学', '商事主体、商事行为与组织制度', ['商法基本原则', '公司法', '合伙企业与商事主体', '证券与票据制度', '保险与破产制度']],
  ['知识产权法学', '知识成果、标识与创新保护', ['知识产权基本理论', '著作权法', '专利法', '商标法', '知识产权保护与救济']],
  ['国际法学', '国际社会基本规则与国家关系', ['国际法基本原理', '国际法主体与责任', '领土、海洋与空间法', '外交与领事关系', '国际争端解决']],
  ['国际私法学', '涉外民商事关系的法律适用', ['国际私法基本理论', '冲突规范与准据法', '涉外民事关系', '国际民事诉讼', '国际商事仲裁']],
  ['国际经济法学', '国际贸易、投资与经济合作规则', ['国际经济法基本理论', '国际贸易法', '国际投资法', '国际金融法', '世界贸易组织法']],
];

type LawStatus = { chapters: number; knowledgePoints: number; questions: number; generatedQuestions: number; examTemplates: number };

export default function LawKnowledge() {
  const navigate = useNavigate();
  const [active, setActive] = useState('0-0');
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [status, setStatus] = useState<LawStatus | null>(null);
  useEffect(() => { http.get('/law/status').then((res: any) => setStatus(res.data)).catch(() => undefined); }, []);
  const selected = useMemo(() => { const [ci, pi] = active.split('-').map(Number); const course = CURRICULUM[ci]; return { ci, pi, course: course[0], description: course[1], point: course[2][pi] }; }, [active]);
  const practiceUrl = '/practice?section=' + encodeURIComponent(selected.course);
  return <div className="mx-auto max-w-7xl space-y-5 p-3 pb-24 sm:p-6">
    <header className="university-hero rounded-2xl p-5 text-white sm:p-6">
      <div className="flex items-center gap-2 text-sm text-indigo-100"><Scale size={18} /> MA ENGINEERING LAW CURRICULUM</div>
      <h1 className="mt-2 text-2xl font-black sm:text-3xl">马工程法学学习库</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">依据马克思主义理论研究和建设工程重点教材体系，按课程、章节、知识点和案例学习。课程框架用于通用本科复习，具体授课进度请以学校课程表为准。</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/15 px-3 py-1">13 门课程</span><span className="rounded-full bg-white/15 px-3 py-1">马工程教材导向</span><span className="rounded-full bg-white/15 px-3 py-1">题目：课程生成练习</span>{status && <span className="rounded-full bg-white/15 px-3 py-1">线上：{status.chapters} 章 · {status.knowledgePoints} 点 · {status.questions} 题</span>}</div>
    </header>
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm leading-6 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"><strong>学习提示：</strong>先阅读基本概念和基本原理，再结合制度规范、案例事实和答题结构练习。系统生成题不是官方教材原题、官方真题或教师审定题。</div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
      <section className="card p-3 sm:p-4"><h2 className="flex items-center gap-2 font-bold"><BookOpen size={18} className="text-indigo-600" />课程与知识点</h2><div className="mt-3 max-h-[68vh] space-y-2 overflow-y-auto pr-1">{CURRICULUM.map((course, ci) => <div key={course[0]}><button className="flex min-h-11 w-full items-center justify-between rounded-lg bg-indigo-50 p-3 text-left font-bold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100" onClick={() => setOpen((prev) => ({ ...prev, [ci]: !prev[ci] }))}>{course[0]}{open[ci] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>{open[ci] && <div className="mt-1 space-y-1 pl-2">{course[2].map((point, pi) => <button key={point} className={'min-h-10 block w-full rounded p-2 text-left text-sm ' + (active === ci + '-' + pi ? 'bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-100' : 'text-gray-600 dark:text-gray-300')} onClick={() => setActive(ci + '-' + pi)}>{point}<span className="float-right text-xs text-gray-400">未学习</span></button>)}</div>}</div>)}</div></section>
      <section className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wide text-indigo-600">当前知识点</div><h2 className="mt-2 text-xl font-black">{selected.point}</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{selected.course} · {selected.description}</p></div><Scale className="text-indigo-500" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div className="text-xs text-gray-500">第一步</div><div className="mt-1 font-bold">概念与原理</div></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div className="text-xs text-gray-500">第二步</div><div className="mt-1 font-bold">制度与法条</div></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div className="text-xs text-gray-500">第三步</div><div className="mt-1 font-bold">案例与答题</div></div></div><div className="mt-6 rounded-xl border border-dashed border-indigo-300 p-4 text-sm leading-7 text-gray-600 dark:text-gray-300">建议围绕“概念—原理—规则—事实—结论”建立知识点笔记，并在练习后记录错因。</div><div className="mt-6 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => navigate(practiceUrl)}><PenLine size={16} />专项练习</button><button className="btn-outline" onClick={() => navigate('/practice?mode=smart&section=' + encodeURIComponent(selected.course))}>智能练习</button></div></section>
    </div>
  </div>;
}
