/**
 * 批量导入本科题目模板
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// CET-4 题目
const cet4Questions = [
  { type: 'choice', section: '听力理解', stem: 'W: Would you like to have dinner with us tonight? M: I\'d love to, but I have to finish my report.', options: ['A. He will join them for dinner.', 'B. He cannot go because of work.', 'C. He already had dinner.', 'D. He doesn\'t like their food.'], answer: 'B', solution: { analysis: '男士说他必须完成报告，所以不能一起去吃饭。' } },
  { type: 'choice', section: '听力理解', stem: 'W: Have you booked the tickets for the concert? M: Not yet, but I plan to do it tomorrow morning.', options: ['A. He has booked the tickets.', 'B. He will book tickets tomorrow.', 'C. The concert is cancelled.', 'D. He doesn\'t want to go.'], answer: 'B', solution: { analysis: '男士说还没订票，计划明天早上订。' } },
  { type: 'choice', section: '听力理解', stem: 'M: How much does the textbook cost? W: It was $50, but now it\'s on sale for half price.', options: ['A. $50.', 'B. $25.', 'C. $75.', 'D. $100.'], answer: 'B', solution: { analysis: '原价$50，半价是$25。' } },
  { type: 'choice', section: '听力理解', stem: 'W: Are you going to the meeting this afternoon? M: I would if I weren\'t so busy with the project deadline.', options: ['A. He will definitely attend.', 'B. He can\'t go because of heavy workload.', 'C. The meeting is cancelled.', 'D. He doesn\'t have a project.'], answer: 'B', solution: { analysis: '项目截止日期临近，工作繁忙无法参加。' } },
  { type: 'choice', section: '阅读理解', stem: 'Passage: "Many college students work part-time jobs while studying. This can help them gain practical experience and earn money for tuition. However, working too many hours may affect their academic performance."\nWhat is the main idea of the passage?', options: ['A. College students should never work.', 'B. Part-time work has both benefits and drawbacks.', 'C. Working affects all students equally.', 'D. Tuition is too expensive.'], answer: 'B', solution: { analysis: '文章既提到兼职的好处（经验和收入），也提到可能影响学业。' } },
  { type: 'choice', section: '阅读理解', stem: 'Passage: "The Internet has changed the way we communicate. People can now stay in touch with friends and family across the globe instantly. However, some experts worry that face-to-face communication skills are declining."\nThe word "instantly" is closest in meaning to:', options: ['A. Quickly.', 'B. Slowly.', 'C. Rarely.', 'D. Never.'], answer: 'A', solution: { analysis: '"Instantly"意为"立即地"，与"quickly"意思相近。' } },
  { type: 'choice', section: '阅读理解', stem: 'Passage: "Exercise is important for maintaining a healthy weight. Regular physical activity helps burn calories and build muscle. Experts recommend at least 30 minutes of exercise most days of the week."', options: ['A. Exercise is only for weight loss.', 'B. 30 minutes of daily exercise is recommended.', 'C. Muscle building is not important.', 'D. Exercise should be done once a week.'], answer: 'B', solution: { analysis: '专家建议每周大部分天进行至少30分钟运动。' } },
  { type: 'choice', section: '阅读理解', stem: 'Passage: "Reading books can improve your vocabulary and knowledge. Studies show that people who read regularly have better cognitive function and lower stress levels."', options: ['A. Reading has no benefit.', 'B. Regular readers have better brain function.', 'C. Reading increases stress.', 'D. Only fiction books help.'], answer: 'B', solution: { analysis: '研究显示经常阅读的人认知功能更好。' } },
  { type: 'fill', section: '翻译', stem: '请将以下句子翻译成英文：可持续发展是满足当代人的需求而不损害后代人满足其需求的能力。', answer: 'Sustainable development is development that meets the needs of the present without compromising the ability of future generations to meet their own needs.', solution: { analysis: '这是布伦特兰报告中对可持续发展的经典定义。' } },
  { type: 'essay', section: '写作', stem: 'Write an essay (120-180 words) on the topic: "The Importance of Critical Thinking in College Education"', answer: '范文要点：1. 批判性思维的定义 2. 对学术研究的帮助 3. 对未来职业的影响 4. 结论', solution: { analysis: '需包含清晰的论点、论据和结论，字数120-180词。' } },
];

// 法律题目
const lawQuestions = [
  { type: 'choice', section: '宪法', stem: '根据我国宪法，中华人民共和国的一切权力属于：', options: ['A. 中国共产党', 'B. 人民', 'C. 国务院', 'D. 全国人民代表大会'], answer: 'B', solution: { analysis: '《宪法》第2条：中华人民共和国的一切权力属于人民。' } },
  { type: 'choice', section: '宪法', stem: '我国宪法的修改需由全国人民代表大会以全体代表的多少通过？', options: ['A. 过半数', 'B. 三分之二以上', 'C. 四分之三以上', 'D. 全体一致'], answer: 'B', solution: { analysis: '《宪法》第64条：宪法的修改需全体代表三分之二以上通过。' } },
  { type: 'choice', section: '宪法', stem: '中华人民共和国主席、副主席由谁选举产生？', options: ['A. 全国人大常委会', 'B. 国务院', 'C. 全国人民代表大会', 'D. 中国人民政治协商会议'], answer: 'C', solution: { analysis: '《宪法》第79条：国家主席、副主席由全国人民代表大会选举。' } },
  { type: 'choice', section: '民法', stem: '根据《民法典》，完全民事行为能力的年龄下限是：', options: ['A. 16周岁', 'B. 18周岁', 'C. 20周岁', 'D. 22周岁'], answer: 'B', solution: { analysis: '《民法典》第17条：十八周岁以上的自然人为成年人，具有完全民事行为能力。' } },
  { type: 'choice', section: '民法', stem: '下列哪项不属于物权的种类？', options: ['A. 所有权', 'B. 用益物权', 'C. 担保物权', 'D. 债权'], answer: 'D', solution: { analysis: '物权包括所有权、用益物权和担保物权。债权属于相对权。' } },
  { type: 'choice', section: '民法', stem: '诉讼时效期间一般为：', options: ['A. 1年', 'B. 2年', 'C. 3年', 'D. 20年'], answer: 'C', solution: { analysis: '《民法典》第188条：诉讼时效期间为三年。' } },
  { type: 'choice', section: '刑法', stem: '我国刑法规定，已满多少周岁的人犯罪，应当负刑事责任？', options: ['A. 14周岁', 'B. 16周岁', 'C. 18周岁', 'D. 20周岁'], answer: 'B', solution: { analysis: '《刑法》第17条：已满十六周岁的人犯罪，应当负刑事责任。' } },
  { type: 'choice', section: '刑法', stem: '下列哪项不属于刑罚的主刑？', options: ['A. 管制', 'B. 拘役', 'C. 罚金', 'D. 有期徒刑'], answer: 'C', solution: { analysis: '罚金属于附加刑，主刑包括管制、拘役、有期徒刑、无期徒刑和死刑。' } },
  { type: 'choice', section: '刑法', stem: '犯罪未遂是指：', options: ['A. 犯罪已经完成', 'B. 已经着手实行犯罪，由于意志以外的原因而未得逞', 'C. 犯罪预备阶段', 'D. 自动放弃犯罪'], answer: 'B', solution: { analysis: '《刑法》第23条：已经着手实行犯罪，由于犯罪分子意志以外的原因而未得逞的，是犯罪未遂。' } },
];

// 大学通识课题目
const univQuestions = [
  { type: 'choice', section: '大学语文', stem: '《红楼梦》的作者是：', options: ['A. 施耐庵', 'B. 罗贯中', 'C. 曹雪芹', 'D. 吴承恩'], answer: 'C', solution: { analysis: '《红楼梦》是清代曹雪芹创作的中国古典四大名著之一。' } },
  { type: 'choice', section: '大学语文', stem: '"床前明月光，疑是地上霜"出自哪位诗人的作品？', options: ['A. 杜甫', 'B. 白居易', 'C. 李白', 'D. 王维'], answer: 'C', solution: { analysis: '这是李白的《静夜思》，是中国最广为流传的古诗之一。' } },
  { type: 'choice', section: '大学语文', stem: '下列哪位作家不属于"五四"新文化运动代表人物？', options: ['A. 鲁迅', 'B. 胡适', 'C. 沈从文', 'D. 陈独秀'], answer: 'C', solution: { analysis: '沈从文虽然也是现代作家，但不属于五四新文化运动的核心代表人物。' } },
  { type: 'choice', section: '高等数学·极限', stem: '极限 lim(x→0) sin(x)/x = ?', options: ['A. 0', 'B. 1', 'C. ∞', 'D. 不存在'], answer: 'B', solution: { analysis: '这是重要极限之一：lim(x→0) sin(x)/x = 1。' } },
  { type: 'choice', section: '高等数学·极限', stem: '极限 lim(x→∞) (1 + 1/x)^x = ?', options: ['A. 0', 'B. 1', 'C. e', 'D. ∞'], answer: 'C', solution: { analysis: '这是自然对数底e的定义：lim(x→∞) (1 + 1/x)^x = e ≈ 2.718。' } },
  { type: 'choice', section: '高等数学·导数', stem: '函数 f(x) = x² 在 x=2 处的导数是：', options: ['A. 2', 'B. 4', 'C. 8', 'D. 1'], answer: 'B', solution: { analysis: 'f\'(x) = 2x，所以 f\'(2) = 4。' } },
  { type: 'choice', section: '思想道德修养', stem: '社会主义核心价值观个人层面的价值准则是：', options: ['A. 富强、民主、文明、和谐', 'B. 自由、平等、公正、法治', 'C. 爱国、敬业、诚信、友善', 'D. 公平、正义、民主、法治'], answer: 'C', solution: { analysis: '社会主义核心价值观：国家层面(富强民主文明和谐)、社会层面(自由平等公正法治)、个人层面(爱国敬业诚信友善)。' } },
  { type: 'choice', section: '思想道德修养', stem: '"四个自信"是指：', options: ['A. 道路自信、理论自信、制度自信、文化自信', 'B. 经济自信、政治自信、文化自信、社会自信', 'C. 理论自信、制度自信、科技自信、生态自信', 'D. 道路自信、政策自信、制度自信、文化自信'], answer: 'A', solution: { analysis: '"四个自信"是道路自信、理论自信、制度自信、文化自信。' } },
];

async function main() {
  console.log('🤖 批量导入本科题目...\n');
  
  const subjects = await prisma.subject.findMany({ where: { code: { in: ['CET4', 'CET6', 'LAW', 'UNIV'] } } });
  const subjectMap = new Map(subjects.map(s => [s.code, s.id]));
  
  let totalInserted = 0;
  
  // CET-4
  const cet4Id = subjectMap.get('CET4');
  if (cet4Id) {
    const existing = await prisma.question.count({ where: { subjectId: cet4Id } });
    const need = Math.max(0, 50 - existing);
    const questions = cet4Questions.slice(0, need).map(q => ({
      subjectId: cet4Id, type: q.type, section: q.section, stem: q.stem,
      options: q.options || null, answer: q.answer, solution: q.solution,
      difficulty: 2, source: 'template', status: 'active'
    }));
    await prisma.question.createMany({ data: questions, skipDuplicates: true });
    console.log(`✅ CET-4: +${questions.length} 题 (共${existing + questions.length})`);
    totalInserted += questions.length;
  }
  
  // 法律
  const lawId = subjectMap.get('LAW');
  if (lawId) {
    const existing = await prisma.question.count({ where: { subjectId: lawId } });
    const need = Math.max(0, 40 - existing);
    const questions = lawQuestions.slice(0, need).map(q => ({
      subjectId: lawId, type: q.type, section: q.section, stem: q.stem,
      options: q.options || null, answer: q.answer, solution: q.solution,
      difficulty: 3, source: 'template', status: 'active'
    }));
    await prisma.question.createMany({ data: questions, skipDuplicates: true });
    console.log(`✅ 法律: +${questions.length} 题 (共${existing + questions.length})`);
    totalInserted += questions.length;
  }
  
  // 大学通识课
  const univId = subjectMap.get('UNIV');
  if (univId) {
    const existing = await prisma.question.count({ where: { subjectId: univId } });
    const need = Math.max(0, 30 - existing);
    const questions = univQuestions.slice(0, need).map(q => ({
      subjectId: univId, type: q.type, section: q.section, stem: q.stem,
      options: q.options || null, answer: q.answer, solution: q.solution,
      difficulty: 2, source: 'template', status: 'active'
    }));
    await prisma.question.createMany({ data: questions, skipDuplicates: true });
    console.log(`✅ 通识课: +${questions.length} 题 (共${existing + questions.length})`);
    totalInserted += questions.length;
  }
  
  console.log(`\n🎉 共导入 ${totalInserted} 题`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
