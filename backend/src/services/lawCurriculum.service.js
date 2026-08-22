import prisma from '../utils/prisma.js';

export const LAW_CURRICULUM = [
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
  ['法律文书写作与案例分析','法律实务训练',['法律检索与法条引用','案例事实提炼','法律论证结构','诉讼文书基本格式']],
];
const templates = [
  ['LAW-COURSE-MID','法学专业课期中综合模拟','期中：法理学、宪法学、民法总论、刑法总论与案例分析',100,120,[['法理学·单项选择题','choice',10,3],['宪法学·单项选择题','choice',10,3],['民法总论·单项选择题','choice',10,3],['刑法总论·单项选择题','choice',10,3],['法律文书写作与案例分析·案例分析题','essay',2,5]]],
  ['LAW-COURSE-FINAL','法学专业课期末综合模拟','期末：民法、刑法、行政法、诉讼法、商法与案例分析',100,120,[['民法分论·单项选择题','choice',10,3],['刑法分论·单项选择题','choice',10,3],['行政法与行政诉讼法·单项选择题','choice',10,3],['民事诉讼法·单项选择题','choice',10,3],['法律文书写作与案例分析·案例分析题','essay',2,5]]],
  ['LAW-CHAPTER','法学章节专项模拟','按章节掌握情况进行专项测试',100,60,[['民法总论·单项选择题','choice',10,5],['民法总论·名词解释/简答题','fill',3,10],['民法总论·案例分析题','essay',1,20]]],
];
const qVariants = (course, point) => [
  { key:'choice-core', type:'choice', label:'单项选择题', stem:course+'｜'+point+'：下列哪项最符合本知识点的基本分析方法？', options:['A. 仅凭直觉判断','B. 结合构成要件与法律后果分析','C. 只看主观愿望','D. 只看最终结果'], answer:'B' },
  { key:'choice-rule', type:'choice', label:'单项选择题·规则适用', stem:course+'｜'+point+'：分析具体案件时，首先应当做什么？', options:['A. 直接给出结论','B. 找到相关法律规则并拆解构成要件','C. 只关注当事人情绪','D. 忽略案件事实'], answer:'B' },
  { key:'choice-fact', type:'choice', label:'单项选择题·事实认定', stem:course+'｜'+point+'：法律论证中事实与规则的关系是？', options:['A. 事实无需证明','B. 事实应当与法律规则的要件逐项对应','C. 规则可以替代事实','D. 只看结果不看过程'], answer:'B' },
  { key:'choice-multi', type:'choice', label:'多项选择题', stem:course+'｜'+point+'：学习本知识点时，哪些分析内容应当同时关注？', options:['A. 法律概念','B. 构成要件','C. 法律后果','D. 事实与规则的对应'], answer:'A B C D' },
  { key:'fill-core', type:'fill', label:'名词解释/简答题', stem:course+'｜'+point+'：请解释该知识点的核心概念、构成要件或法律后果。', options:null, answer:'按照规则、要件、事实和结论作答。' },
  { key:'fill-mistake', type:'fill', label:'易错点辨析题', stem:course+'｜'+point+'：请说明本知识点最容易出现的一个错误，并给出纠正方法。', options:null, answer:'不能只背结论，应结合规则、构成要件、事实对应和法律后果完整分析。' },
  { key:'essay-case', type:'essay', label:'案例分析题', stem:course+'｜'+point+'案例分析：请按事实识别、法律关系、适用规则、法律后果和结论作答。', options:null, answer:'按照事实识别、法律关系、适用规则、法律后果和结论作答。' },
  { key:'essay-irac', type:'essay', label:'法律论证题', stem:course+'｜'+point+'：请使用“争点—规则—分析—结论”结构完成一份法律论证。', options:null, answer:'应先提出争点，再说明规则，结合事实分析，最后给出结论。' },
  { type:'essay', label:'法律文书题', stem:course+'｜'+point+'：请拟写一份简要法律分析意见，说明争点、依据、论证和结论。', options:null, answer:'应包含争点识别、法律依据、事实对应、风险分析和明确结论。' },
];
export async function ensureLawExamTemplates() {
  const subject = await prisma.subject.findUnique({ where: { code: 'LAW' } });
  if (!subject) throw new Error('LAW subject not found');
  for (const [_code,name,description,totalScore,duration,sections] of templates) {
    const config={examMode:'undergraduate',courseCode:'LAW',sections:sections.map(([n,t,c,s])=>({name:n,type:t,count:c,scorePer:s}))};
    await prisma.examTemplate.upsert({ where:{name}, update:{description,config,totalScore,duration}, create:{subjectId:subject.id,name,description,config,totalScore,duration} });
  }
  return { examTemplates: templates.length };
}

export async function syncLawCurriculum() {
  const subject = await prisma.subject.findUnique({ where:{ code:'LAW' } });
  if (!subject) throw new Error('LAW subject not found');
  const chapterResults = await Promise.all(LAW_CURRICULUM.map(async ([course, description, points], ci) => {
    const code='LAW-'+String(ci+1).padStart(2,'0');
    const chapter=await prisma.chapter.upsert({ where:{code}, update:{name:course,description,order:ci+1}, create:{subjectId:subject.id,code,name:course,description,order:ci+1} });
    const pointResults = await Promise.all(points.map(async (point, pi) => {
      const kpCode=code+'-'+String(pi+1).padStart(2,'0');
      const kp=await prisma.knowledgePoint.upsert({ where:{code:kpCode}, update:{name:point,summary:course+'：'+point+'。掌握概念、构成要件、法律后果、典型案例和易错点。',level:2,difficulty:ci%3+2}, create:{chapterId:chapter.id,code:kpCode,name:point,level:2,difficulty:ci%3+2,summary:course+'：'+point+'。掌握概念、构成要件、法律后果、典型案例和易错点。'} });
      const variantResults = await Promise.all(qVariants(course,point).map(async (variant) => {
        const id='law-seed-'+kpCode+'-'+(variant.key || variant.type);
        const q=await prisma.question.upsert({ where:{id}, update:{section:course+'·'+variant.label,options:variant.options,answer:variant.answer,source:'course-generated',status:'active'}, create:{id,subjectId:subject.id,type:variant.type,section:course+'·'+variant.label,stem:variant.stem,options:variant.options,answer:variant.answer,solution:{analysis:'本科法学课程生成练习题，来源为 course-generated；不代表官方真题。',knowledgePoint:point},difficulty:ci%3+2,source:'course-generated',status:'active'} });
        await prisma.questionKnowledge.upsert({ where:{questionId_knowledgePointId:{questionId:q.id,knowledgePointId:kp.id}}, update:{}, create:{questionId:q.id,knowledgePointId:kp.id} });
        return q.id;
      }));
      return { questions: variantResults.length };
    }));
    return { knowledgePoints: pointResults.length, questions: pointResults.reduce((sum, item) => sum + item.questions, 0) };
  }));
  await ensureLawExamTemplates();
  return { chapters: chapterResults.length, knowledgePoints: chapterResults.reduce((sum, item) => sum + item.knowledgePoints, 0), questions: chapterResults.reduce((sum, item) => sum + item.questions, 0), examTemplates: templates.length };
}
