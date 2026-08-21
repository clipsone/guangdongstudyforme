import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(here, '..', '.env.local') });
  dotenv.config({ path: path.join(here, '..', '.env') });
}
import prisma from '../src/utils/prisma.js';
const curriculum = [
  ['法理学','法律本体与法律规范',['法的概念与特征','法律规范的结构','法律渊源与效力','法律责任基础']],
  ['宪法学','国家基本制度',['人民主权与国家性质','基本权利与义务','国家机构体系','宪法监督']],
  ['民法总论','民事法律关系',['民事主体','民事法律行为','代理制度','诉讼时效']],
  ['民法分论','合同与侵权',['合同成立与效力','合同履行与违约','物权变动','侵权责任构成']],
  ['刑法总论','犯罪论体系',['犯罪构成','故意与过失','正当防卫与紧急避险','共同犯罪']],
  ['刑法分论','常见犯罪类型',['财产犯罪','人身犯罪','职务犯罪','罪数与刑罚']],
  ['行政法与行政诉讼法','行政行为与救济',['行政行为合法性','行政许可与处罚','行政复议','行政诉讼受案范围']],
  ['民事诉讼法','民事程序基础',['管辖','当事人与证据','审判程序','执行程序']],
  ['刑事诉讼法','刑事程序基础',['侦查与强制措施','辩护制度','证据规则','审判程序']],
  ['商法与经济法','市场主体与交易',['公司法基础','票据与商事交易','消费者权益保护','市场竞争规则']],
  ['知识产权法','智力成果保护',['著作权','专利权','商标权','侵权救济']],
  ['法律文书写作与案例分析','法律实务训练',['法律检索与法条引用','案例事实提炼','法律论证结构','诉讼文书基本格式']]
];
const questionTemplates = [
  { type:'choice', label:'单项选择题', options:['A. 仅依据个人直觉判断','B. 结合构成要件与法律后果分析','C. 只看行为人的主观愿望','D. 只看最终结果'], answer:'B' },
  { type:'essay', label:'案例分析题', options:null, answer:'按照“事实识别—法律关系—构成要件—法律后果—结论”的顺序作答。' }
];
async function main(){ const subject=await prisma.subject.findUnique({where:{code:'LAW'}}); if(!subject) throw new Error('LAW subject not found'); let qCount=0,kpCount=0;
 for(let ci=0;ci<curriculum.length;ci++){ const [course,desc,points]=curriculum[ci]; const chapter=await prisma.chapter.upsert({where:{code:'LAW-'+String(ci+1).padStart(2,'0')},update:{name:course,description:desc,order:ci+1},create:{subjectId:subject.id,code:'LAW-'+String(ci+1).padStart(2,'0'),name:course,description:desc,order:ci+1}}); for(let pi=0;pi<points.length;pi++){ const code='LAW-'+String(ci+1).padStart(2,'0')+'-'+String(pi+1).padStart(2,'0'); const kp=await prisma.knowledgePoint.upsert({where:{code},update:{name:points[pi],summary:course+'：'+points[pi]+'。学习时应掌握概念、构成要件、法律后果、典型案例和易错点。',level:2,difficulty:ci%3+2},create:{chapterId:chapter.id,code,name:points[pi],level:2,difficulty:ci%3+2,summary:course+'：'+points[pi]+'。学习时应掌握概念、构成要件、法律后果、典型案例和易错点。'}}); kpCount++;
   for(const tpl of questionTemplates){ const stem=tpl.type==='choice'?course+'｜'+points[pi]+'：下列哪项最符合本知识点的基本分析方法？':course+'｜'+points[pi]+'案例分析：请结合本知识点，说明事实认定、法律关系、适用规则和法律后果。'; const exists=await prisma.question.findFirst({where:{subjectId:subject.id,stem}}); const q=exists||await prisma.question.create({data:{subjectId:subject.id,type:tpl.type,section:course+'·'+tpl.label,stem,options:tpl.options,answer:tpl.answer,solution:{analysis:'本题为本科法学课程生成练习题。建议使用：概念/规则—构成要件—事实对应—结论的答题结构。',knowledgePoint:points[pi]},difficulty:ci%3+2,source:'course-generated',status:'active'}}); await prisma.questionKnowledge.upsert({where:{questionId_knowledgePointId:{questionId:q.id,knowledgePointId:kp.id}},update:{},create:{questionId:q.id,knowledgePointId:kp.id}}); qCount++; }
 }} console.log(JSON.stringify({courses:curriculum.length,knowledgePoints:kpCount,questions:qCount})); await prisma.$disconnect(); }
main().catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1)});
