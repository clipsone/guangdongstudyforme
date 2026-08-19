/**
 * 本地快速批量生成题目（无需 AI API）
 * 使用预置模板随机组合生成题目
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 题目模板库
const TEMPLATES = {
  CET4_LISTENING: [
    { stem: 'W: Would you like to have dinner with us tonight? M: I\'d love to, but I have to finish my report.', options: ['A. He will join them for dinner.', 'B. He cannot go because of work.', 'C. He already had dinner.', 'D. He doesn\'t like their food.'], answer: 'B', analysis: '男士说他必须完成报告，所以不能一起去吃饭。' },
    { stem: 'W: Have you booked the tickets for the concert? M: Not yet, but I plan to do it tomorrow morning.', options: ['A. He has booked the tickets.', 'B. He will book tickets tomorrow.', 'C. The concert is cancelled.', 'D. He doesn\'t want to go.'], answer: 'B', analysis: '男士说还没订票，计划明天早上订。' },
    { stem: 'M: How much does the textbook cost? W: It was $50, but now it\'s on sale for half price.', options: ['A. $50.', 'B. $25.', 'C. $75.', 'D. $100.'], answer: 'B', analysis: '原价$50，半价是$25。' },
    { stem: 'W: I heard you got a promotion. M: Yes, but the new position requires more travel.', options: ['A. He doesn\'t want the promotion.', 'B. The new job involves more traveling.', 'C. He was fired.', 'D. The promotion is temporary.'], answer: 'B', analysis: '新职位需要更多出差。' },
    { stem: 'M: Could you recommend a good restaurant near here? W: There\'s an Italian place two blocks away, but you need a reservation.', options: ['A. The restaurant is far away.', 'B. You should book a table in advance.', 'C. The Italian food is terrible.', 'D. There are no restaurants nearby.'], answer: 'B', analysis: '女士建议提前预订。' },
    { stem: 'W: Are you going to the meeting this afternoon? M: I would if I weren\'t so busy with the project deadline.', options: ['A. He will definitely attend.', 'B. He can\'t go because of heavy workload.', 'C. The meeting is cancelled.', 'D. He doesn\'t have a project.'], answer: 'B', analysis: '项目截止日期临近，工作繁忙无法参加。' },
  ],
  CET4_READING: [
    { stem: 'Passage: "Many college students work part-time jobs while studying. This can help them gain practical experience and earn money for tuition. However, working too many hours may affect their academic performance."\nWhat is the main idea of the passage?', options: ['A. College students should never work.', 'B. Part-time work has both benefits and drawbacks.', 'C. Working affects all students equally.', 'D. Tuition is too expensive.'], answer: 'B', analysis: '文章既提到兼职的好处（经验和收入），也提到可能影响学业。' },
    { stem: 'Passage: "The Internet has changed the way we communicate. People can now stay in touch with friends and family across the globe instantly. However, some experts worry that face-to-face communication skills are declining."\nThe word "instantly" is closest in meaning to:', options: ['A. Quickly.', 'B. Slowly.', 'C. Rarely.', 'D. Never.'], answer: 'A', analysis: '"Instantly"意为"立即地"，与"quickly"意思相近。' },
    { stem: 'Passage: "Sleep is essential for good health. During sleep, the body repairs itself and the brain processes information from the day. Most adults need seven to eight hours of sleep per night."\nHow many hours of sleep do most adults need?', options: ['A. 5-6 hours.', 'B. 7-8 hours.', 'C. 9-10 hours.', 'D. 4-5 hours.'], answer: 'B', analysis: '大多数成年人需要7-8小时睡眠。' },
    { stem: 'Passage: "Exercise is important for maintaining a healthy weight. Regular physical activity helps burn calories and build muscle. Experts recommend at least 30 minutes of exercise most days of the week."', options: ['A. Exercise is only for weight loss.', 'B. 30 minutes of daily exercise is recommended.', 'C. Muscle building is not important.', 'D. Exercise should be done once a week.'], answer: 'B', analysis: '专家建议每周大部分天进行至少30分钟运动。' },
    { stem: 'Passage: "Reading books can improve your vocabulary and knowledge. Studies show that people who read regularly have better cognitive function and lower stress levels."', options: ['A. Reading has no benefit.', 'B. Regular readers have better brain function.', 'C. Reading increases stress.', 'D. Only fiction books help.'], answer: 'B', analysis: '研究显示经常阅读的人认知功能更好。' },
  ],
  CET6_READING: [
    { stem: 'Passage: "Artificial intelligence has made tremendous progress in recent years. Machine learning algorithms can now recognize images, translate languages, and even write essays. However, concerns about job displacement and privacy remain."', options: ['A. AI has solved all problems.', 'B. Concerns about AI continue despite advances.', 'C. AI cannot write essays.', 'D. Job displacement is impossible.'], answer: 'B', analysis: '尽管AI进步显著，但对就业和隐私的担忧仍然存在。' },
    { stem: 'Passage: "Climate change is one of the most pressing issues of our time. Rising global temperatures are causing ice caps to melt, sea levels to rise, and extreme weather events to become more frequent."', options: ['A. Climate change is not a serious issue.', 'B. Melting ice caps contribute to rising sea levels.', 'C. Extreme weather is decreasing.', 'D. Global temperatures are falling.'], answer: 'B', analysis: '冰盖融化导致海平面上升。' },
    { stem: 'Passage: "The concept of emotional intelligence has gained popularity in recent decades. It refers to the ability to recognize and manage one\'s own emotions and those of others. Research suggests EQ may be as important as IQ for success."', options: ['A. Emotional intelligence is unimportant.', 'B. EQ is considered as valuable as IQ.', 'C. IQ is the only predictor of success.', 'D. Emotions should be ignored.'], answer: 'B', analysis: '研究认为情商可能与智商同样重要。' },
    { stem: 'Passage: "The gig economy has transformed traditional employment. Workers now have more flexibility but less job security. Benefits such as health insurance and retirement plans are often unavailable."', options: ['A. Gig work provides full benefits.', 'B. Flexibility comes at the cost of security.', 'C. Traditional employment is gone.', 'D. All gig workers earn more.'], answer: 'B', analysis: '灵活性的代价是缺乏工作保障。' },
  ],
  LAW_CONSTITUTION: [
    { stem: '根据我国宪法，中华人民共和国的一切权力属于：', options: ['A. 中国共产党', 'B. 人民', 'C. 国务院', 'D. 全国人民代表大会'], answer: 'B', analysis: '《宪法》第2条：中华人民共和国的一切权力属于人民。' },
    { stem: '我国宪法的修改需由全国人民代表大会以全体代表的多少通过？', options: ['A. 过半数', 'B. 三分之二以上', 'C. 四分之三以上', 'D. 全体一致'], answer: 'B', analysis: '《宪法》第64条：宪法的修改，由全国人大常委会或五分之一以上代表提议，并由全国人大以全体代表的三分之二以上通过。' },
    { stem: '我国公民的基本权利不包括：', options: ['A. 选举权和被选举权', 'B. 宗教信仰自由', 'C. 自由买卖土地', 'D. 言论自由'], answer: 'C', analysis: '土地所有权属于国家或集体，公民无权自由买卖。' },
    { stem: '中华人民共和国主席、副主席由谁选举产生？', options: ['A. 全国人大常委会', 'B. 国务院', 'C. 全国人民代表大会', 'D. 中国人民政治协商会议'], answer: 'C', analysis: '《宪法》第79条：国家主席、副主席由全国人民代表大会选举。' },
    { stem: '我国民族区域自治地方的自治机关是：', options: ['A. 人民代表大会和人民政府', 'B. 人民法院和人民检察院', 'C. 政协和党委', 'D. 村委会和居委会'], answer: 'A', analysis: '《宪法》第112条：民族自治地方的自治机关是自治区、自治州、自治县的人民代表大会和人民政府。' },
  ],
  LAW_CIVIL: [
    { stem: '根据《民法典》，完全民事行为能力的年龄下限是：', options: ['A. 16周岁', 'B. 18周岁', 'C. 20周岁', 'D. 22周岁'], answer: 'B', analysis: '《民法典》第17条：十八周岁以上的自然人为成年人，具有完全民事行为能力。' },
    { stem: '下列哪项不属于物权的种类？', options: ['A. 所有权', 'B. 用益物权', 'C. 担保物权', 'D. 债权'], answer: 'D', analysis: '物权包括所有权、用益物权和担保物权。债权属于相对权，非物权。' },
    { stem: '诉讼时效期间一般为：', options: ['A. 1年', 'B. 2年', 'C. 3年', 'D. 20年'], answer: 'C', analysis: '《民法典》第188条：向人民法院请求保护民事权利的诉讼时效期间为三年。' },
    { stem: '合同解除后，尚未履行的，应当：', options: ['A. 继续履行', 'B. 终止履行', 'C. 双倍赔偿', 'D. 返还财产'], answer: 'B', analysis: '《民法典》第566条：合同解除后，尚未履行的，终止履行。' },
    { stem: '侵权责任的归责原则不包括：', options: ['A. 过错责任原则', 'B. 无过错责任原则', 'C. 公平责任原则', 'D. 严格责任原则'], answer: 'D', analysis: '我国侵权责任归责原则包括过错责任、无过错责任和公平责任。' },
  ],
  LAW_CRIMINAL: [
    { stem: '我国刑法规定，已满多少周岁的人犯罪，应当负刑事责任？', options: ['A. 14周岁', 'B. 16周岁', 'C. 18周岁', 'D. 20周岁'], answer: 'B', analysis: '《刑法》第17条：已满十六周岁的人犯罪，应当负刑事责任。' },
    { stem: '下列哪项不属于刑罚的主刑？', options: ['A. 管制', 'B. 拘役', 'C. 罚金', 'D. 有期徒刑'], answer: 'C', analysis: '罚金属于附加刑，主刑包括管制、拘役、有期徒刑、无期徒刑和死刑。' },
    { stem: '正当防卫明显超过必要限度造成重大损害的，应当：', options: ['A. 不负刑事责任', 'B. 负刑事责任，但应当减轻或免除处罚', 'C. 负刑事责任，但可以从轻处罚', 'D. 负刑事责任，但可以减轻处罚'], answer: 'B', analysis: '《刑法》第20条：正当防卫明显超过必要限度造成重大损害的，应当负刑事责任，但是应当减轻或者免除处罚。' },
    { stem: '犯罪未遂是指：', options: ['A. 犯罪已经完成', 'B. 已经着手实行犯罪，由于意志以外的原因而未得逞', 'C. 犯罪预备阶段', 'D. 自动放弃犯罪'], answer: 'B', analysis: '《刑法》第23条：已经着手实行犯罪，由于犯罪分子意志以外的原因而未得逞的，是犯罪未遂。' },
    { stem: '累犯是指被判处有期徒刑以上刑罚的犯罪分子，刑罚执行完毕或者赦免以后，在多少年内再犯应当判处有期徒刑以上刑罚之罪的？', options: ['A. 三年', 'B. 五年', 'C. 十年', 'D. 终身'], answer: 'B', analysis: '《刑法》第65条：刑罚执行完毕或赦免以后，在五年以内再犯应当判处有期徒刑以上刑罚之罪的，是累犯。' },
  ],
  UNIV_ENGLISH: [
    { stem: '选择正确的时态：By next year, I ___ from this university.', options: ['A. graduate', 'B. will graduate', 'C. will have graduated', 'D. have graduated'], answer: 'C', analysis: '"By next year"表示将来某个时间点之前完成的动作，用将来完成时。' },
    { stem: '选择正确的词性：The ___ of the project was completed on time.', options: ['A. complete', 'B. completely', 'C. completion', 'D. completing'], answer: 'C', analysis: '空格处需要名词，作主语。completion是名词形式。' },
    { stem: '下列哪个句子使用了正确的虚拟语气？', options: ['A. If I am you, I would go.', 'B. If I were you, I would go.', 'C. If I was you, I will go.', 'D. If I be you, I would go.'], answer: 'B', analysis: '与现在事实相反的虚拟语气：If + 主语 + were, 主语 + would +动词原形。' },
  ],
  UNIV_MATH: [
    { stem: '极限 lim(x→0) sin(x)/x = ?', options: ['A. 0', 'B. 1', 'C. ∞', 'D. 不存在'], answer: 'B', analysis: '这是重要极限之一：lim(x→0) sin(x)/x = 1。' },
    { stem: '导数 d/dx(x²) = ?', options: ['A. x', 'B. 2x', 'C. 2', 'D. x²'], answer: 'B', analysis: '幂函数求导法则：d/dx(xⁿ) = nxⁿ⁻¹，所以 d/dx(x²) = 2x。' },
    { stem: '积分 ∫2x dx = ?', options: ['A. x²', 'B. x² + C', 'C. 2', 'D. 2x²'], answer: 'B', analysis: '不定积分：∫2x dx = x² + C，C为积分常数。' },
    { stem: '函数 f(x) = x³ - 3x 的极值点为：', options: ['A. x = 0, x = ±1', 'B. x = ±1', 'C. x = 1', 'D. x = -1'], answer: 'A', analysis: '求导得 f\'(x) = 3x² - 3 = 0，解得 x = ±1。令 f\'(x) = 0 得驻点 x = ±1，f(0) = 0 不是极值点。修正：驻点为 x = ±1。' },
  ],
  PAPER: [
    { stem: '学术论文的参考文献格式中，期刊文章的卷号应如何标注？', options: ['A. 用斜体', 'B. 用正体', 'C. 加粗', 'D. 不加标注'], answer: 'A', analysis: 'APA格式中，期刊名称和卷号应用斜体。' },
    { stem: '论文查重率一般要求低于多少？', options: ['A. 10%', 'B. 20%', 'C. 30%', 'D. 50%'], answer: 'B', analysis: '一般本科院校要求查重率不超过20%-30%，具体以学校规定为准。' },
  ],
};

async function main() {
  console.log('🤖 本地批量生成题目...\n');
  
  const subjects = await prisma.subject.findMany({ where: { code: { in: ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'] } } });
  const subjectMap = new Map(subjects.map(s => [s.code, s.id]));
  
  let totalGenerated = 0;
  let totalInserted = 0;
  
  for (const [key, templates] of Object.entries(TEMPLATES)) {
    const [code, section] = key.split('/');
    const subjectId = subjectMap.get(code);
    if (!subjectId) {
      console.log(`⚠️ 跳过 ${code}: 科目不存在`);
      continue;
    }
    
    // 检查已有数量
    const existing = await prisma.question.count({ where: { subjectId, section } });
    const target = templates.length;
    const need = target - existing;
    
    if (need <= 0) {
      console.log(`✅ ${code}/${section}: 已有 ${existing} 题，无需生成`);
      continue;
    }
    
    // 随机抽取题目
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, need).map(t => ({
      subjectId,
      type: t.options ? 'choice' : 'essay',
      section,
      stem: t.stem,
      options: t.options || null,
      answer: t.answer || '',
      solution: { analysis: t.analysis || '' },
      difficulty: Math.floor(Math.random() * 2) + 2,
      source: 'template',
      status: 'active',
    }));
    
    await prisma.question.createMany({ data: questions, skipDuplicates: true });
    totalGenerated += questions.length;
    totalInserted += questions.filter(q => q.stem).length;
    console.log(`✅ ${code}/${section}: +${questions.length} 题 (共${existing + questions.length})`);
  }
  
  console.log(`\n🎉 本次生成 ${totalGenerated} 题`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
