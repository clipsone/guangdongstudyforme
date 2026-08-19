// 本科模式科目和题目种子数据
// 包含：CET-4、CET-6、雅思、托福、法律基础、大学通识课、论文写作
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========== 科目定义 ==========
const SUBJECTS = [
  {
    code: 'CET4',
    name: '大学英语四级',
    description: '大学英语四级考试（CET-4）备考题库，含听力、阅读、完形、翻译、写作',
    icon: '🎓',
    color: 'blue',
    examDuration: 125,
    totalScore: 710,
    passingScore: 425,
  },
  {
    code: 'CET6',
    name: '大学英语六级',
    description: '大学英语六级考试（CET-6）备考题库，难度高于四级',
    icon: '🏆',
    color: 'purple',
    examDuration: 130,
    totalScore: 710,
    passingScore: 425,
  },
  {
    code: 'IELTS',
    name: '雅思 IELTS',
    description: '雅思考试备考，含听力、阅读、写作、口语模拟',
    icon: '🌍',
    color: 'orange',
    examDuration: 240,
    totalScore: 9,
    passingScore: 6.0,
  },
  {
    code: 'TOEFL',
    name: '托福 TOEFL',
    description: '托福考试备考，含听力、阅读、口语、写作',
    icon: '🇺🇸',
    color: 'red',
    examDuration: 180,
    totalScore: 120,
    passingScore: 80,
  },
  {
    code: 'LAW',
    name: '法律基础',
    description: '法学专业基础课程，含宪法、民法、刑法、法理学',
    icon: '⚖️',
    color: 'slate',
    examDuration: 120,
    totalScore: 100,
    passingScore: 60,
  },
  {
    code: 'UNIV',
    name: '大学通识课',
    description: '广州大学通识核心课程：高等数学、大学语文、思修、近代史',
    icon: '📚',
    color: 'green',
    examDuration: 120,
    totalScore: 100,
    passingScore: 60,
  },
  {
    code: 'PAPER',
    name: '论文写作',
    description: '学术论文写作指导，含选题、结构、引用规范、查重模拟',
    icon: '📝',
    color: 'amber',
    examDuration: 0,
    totalScore: 0,
    passingScore: 0,
  },
];

// ========== CET-4 题目样本 ==========
const CET4_QUESTIONS = {
  listening: [
    {
      type: 'listening',
      section: '听力理解',
      stem: `You will hear: "What time does the library close on weekdays?"\n\nYou will hear it AGAIN.\n\nNow answer:\nA. 5:00 pm\nB. 6:30 pm\nC. 7:00 pm\nD. 8:00 pm`,
      options: ['A. 5:00 pm', 'B. 6:30 pm', 'C. 7:00 pm', 'D. 8:00 pm'],
      answer: 'B',
      solution: { analysis: '根据听力原文，图书馆工作日开放时间为8:00 am至6:30 pm。' },
      difficulty: 2,
    },
    {
      type: 'listening',
      section: '听力理解',
      stem: `You will hear: "I'm sorry I forgot to bring your book back. I'll return it tomorrow."\n\nYou will hear it AGAIN.\n\nNow answer:\nA. Don't worry about it.\nB. You're welcome.\nC. It's my pleasure.\nD. That's right.`,
      options: ['A. Don't worry about it.', 'B. You\'re welcome.', 'C. It\'s my pleasure.', 'D. That\'s right.'],
      answer: 'A',
      solution: { analysis: '对方道歉，应回应"别担心"。B/C用于感谢，D用于确认事实。' },
      difficulty: 2,
    },
  ],
  reading: [
    {
      type: 'choice',
      section: '阅读理解',
      stem: `Passage:\n"College students today face unprecedented challenges in the job market. According to a recent survey, 60% of graduates report difficulty finding employment related to their major. Experts suggest that internships and practical skills are now more valuable than academic achievements alone."\n\nQuestion: What does the passage mainly discuss?\nA. The popularity of college majors\nB. Employment challenges for graduates\nC. The importance of academic achievements\nD. Survey methodology in education`,
      options: ['A. The popularity of college majors', 'B. Employment challenges for graduates', 'C. The importance of academic achievements', 'D. Survey methodology in education'],
      answer: 'B',
      solution: { analysis: '文章主要讨论大学生就业难的问题，60%毕业生难以找到专业相关工作。' },
      difficulty: 3,
    },
    {
      type: 'choice',
      section: '阅读理解',
      stem: `Passage:\n"The invention of the printing press in the 15th century revolutionized the spread of knowledge. Before this innovation, books were hand-copied and extremely expensive. The printing press made books accessible to a wider population, contributing significantly to the Renaissance and the Scientific Revolution."\n\nQuestion: What was the main impact of the printing press?\nA. It ended the Renaissance\nB. It made books more expensive\nC. It accelerated the spread of knowledge\nD. It caused the Scientific Revolution alone`,
      options: ['A. It ended the Renaissance', 'B. It made books more expensive', 'C. It accelerated the spread of knowledge', 'D. It caused the Scientific Revolution alone'],
      answer: 'C',
      solution: { analysis: '印刷术的主要影响是加速了知识的传播，使书籍变得普及。' },
      difficulty: 3,
    },
  ],
  cloze: [
    {
      type: 'choice',
      section: '完形填空',
      stem: `Questions 1-5 are based on the following passage:\n\nLearning a foreign language requires patience and practice. Many students (1)______ that they can learn a language quickly, but this is rarely the case. (2)______ master a new language, one must practice regularly. Some experts recommend studying at least 30 minutes (3)______ day. This consistent practice helps build vocabulary and improve grammar. (4)______, language exchange programs can provide real-world practice. Finally, don't be (5)______ to make mistakes—they are an essential part of learning.`,
      options: ['(1) A. hope  B. wish  C. expect  D. dream', '(2) A. To  B. For  C. By  D. With', '(3) A. each  B. every  C. all  D. both', '(4) A. However  B. Moreover  C. Therefore  D. Otherwise', '(5) A. afraid  B. happy  C. sad  D. proud'],
      answer: 'ABBCA',
      solution: { analysis: '1. expect（期待）2. To（不定式表目的）3. each（每一天）4. Moreover（此外）5. afraid（害怕犯错）' },
      difficulty: 3,
    },
  ],
  translation: [
    {
      type: 'fill',
      section: '翻译',
      stem: `Translate the following sentences into English:\n\n1. 中国是一个有着悠久历史的国家。\n2. 我们应该保护环境，因为地球是我们共同的家园。`,
      answer: '1. China is a country with a long history. 2. We should protect the environment because the earth is our common home.',
      solution: { analysis: '翻译要点：①"悠久历史"译为long history；②"共同的家园"译为common home/home we share。' },
      difficulty: 3,
    },
  ],
  writing: [
    {
      type: 'essay',
      section: '写作',
      stem: `Writing (30 minutes):\n\nFor this part, you are allowed 30 minutes to write a short essay on the topic "The Importance of Critical Thinking in College". You should write at least 120 words but no more than 180 words.`,
      answer: '写作要点：1. 批判性思维的定义 2. 对学习的益处 3. 如何培养',
      solution: { analysis: '范文结构：开头定义批判性思维→主体段落论述好处→结尾建议如何培养。使用However, Therefore, In addition等连接词。' },
      difficulty: 4,
    },
  ],
};

// ========== CET-6 题目样本 ==========
const CET6_QUESTIONS = {
  reading: [
    {
      type: 'choice',
      section: '仔细阅读',
      stem: `Passage:\n"Artificial intelligence has transformed various industries, from healthcare to finance. However, experts warn that AI's rapid advancement also raises ethical concerns. Issues such as algorithmic bias, privacy invasion, and job displacement require careful consideration. Policymakers must balance innovation with regulation to ensure AI benefits all of society."\n\nQuestion: What is the main concern raised in the passage?\nA. AI's positive impact on healthcare\nB. The need to balance AI innovation with ethical concerns\nC. How AI creates new job opportunities\nD. The decline of the financial industry`,
      options: ['A. AI\'s positive impact on healthcare', 'B. The need to balance AI innovation with ethical concerns', 'C. How AI creates new job opportunities', 'D. The decline of the financial industry'],
      answer: 'B',
      solution: { analysis: '文章主旨是AI发展带来的伦理问题，需要平衡创新与监管。' },
      difficulty: 4,
    },
  ],
  translation: [
    {
      type: 'fill',
      section: '翻译',
      stem: `Translate the following passage into English:\n\n中国经济持续健康发展，为世界经济复苏作出了重要贡献。中国坚持创新驱动发展战略，推动经济高质量发展。近年来，中国在科技创新领域取得重大突破，5G技术、量子计算、人工智能等领域走在世界前列。`,
      answer: 'China\'s sustainable and healthy economic development has made important contributions to global economic recovery. China adheres to an innovation-driven development strategy and promotes high-quality economic development. In recent years, China has achieved major breakthroughs in scientific and technological innovation, with 5G technology, quantum computing, and artificial intelligence leading the world.',
      solution: { analysis: '翻译要点：①"持续健康发展"sustainable and healthy development ②"创新驱动发展战略"innovation-driven development strategy ③"高质量发展"high-quality development' },
      difficulty: 4,
    },
  ],
};

// ========== 雅思题目样本 ==========
const IELTS_QUESTIONS = {
  writing: [
    {
      type: 'essay',
      section: '写作 Task 1',
      stem: `Writing Task 1:\nThe chart below shows the percentage of households in owned and rented accommodation in England and Wales from 1918 to 2011.\n\nSummarize the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.`,
      answer: '写作要点：1. 概述总体趋势 2. 对比关键数据点 3. 描述变化阶段',
      solution: { analysis: '雅思Task 1评分标准：任务完成情况(25%)、连贯与衔接(25%)、词汇资源(25%)、语法范围与准确性(25%)。需使用被动语态、比较级、数据描述词汇。' },
      difficulty: 5,
    },
    {
      type: 'essay',
      section: '写作 Task 2',
      stem: `Writing Task 2:\nSome people believe that studying at university or college is the best path to success, while others argue that working in the real world is more valuable.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.`,
      answer: '写作要点：1. 双方观点概述 2. 大学教育的优势 3. 实践经验的價值 4. 个人立场与结论',
      solution: { analysis: '雅思Task 2评分标准同Task 1。需使用高级词汇、复杂句式、清晰论证结构。建议采用四段式：引言→观点一→观点二→结论。' },
      difficulty: 5,
    },
  ],
  reading: [
    {
      type: 'choice',
      section: '阅读',
      stem: `Read the following passage and answer the question:\n\n"The concept of 'cognitive load' refers to the total amount of mental effort being used in working memory. There are three types of cognitive load: intrinsic (inherent difficulty of the material), extraneous (how the information is presented), and germane (effort used to create permanent knowledge). Effective teaching minimizes extraneous load while optimizing germane load."\n\nQuestion: What does 'germane load' refer to?\nA. The inherent difficulty of material\nB. The way information is presented\nC. Effort to create permanent knowledge\nD. The total mental effort in working memory`,
      options: ['A. The inherent difficulty of material', 'B. The way information is presented', 'C. Effort to create permanent knowledge', 'D. The total mental effort in working memory'],
      answer: 'C',
      solution: { analysis: '原文定义：germane load = "effort used to create permanent knowledge"。A是intrinsic，B是extraneous，D是总认知负荷。' },
      difficulty: 4,
    },
  ],
};

// ========== 托福题目样本 ==========
const TOEFL_QUESTIONS = {
  reading: [
    {
      type: 'choice',
      section: '阅读',
      stem: `According to the passage, what caused the decline of the Maya civilization?\nA. Overpopulation leading to resource depletion\nB. Invasion by neighboring tribes\nC. A sudden volcanic eruption\nD. Introduction of a deadly disease`,
      options: ['A. Overpopulation leading to resource depletion', 'B. Invasion by neighboring tribes', 'C. A sudden volcanic eruption', 'D. Introduction of a deadly disease'],
      answer: 'A',
      solution: { analysis: '托福阅读强调细节定位。根据原文，玛雅文明衰落的主要原因是人口过度增长导致资源枯竭。' },
      difficulty: 4,
    },
  ],
  listening: [
    {
      type: 'listening',
      section: '听力讲座',
      stem: `Listen to a university lecture excerpt:\n"Today we're discussing the water cycle. Water evaporates from oceans, lakes, and rivers, then condenses into clouds, and finally precipitates as rain or snow. This continuous movement is essential for all life on Earth."\n\nQuestion: What is the main topic of the lecture?\nA. Ocean currents\nB. The water cycle\nC. Cloud formation\nD. Weather patterns`,
      options: ['A. Ocean currents', 'B. The water cycle', 'C. Cloud formation', 'D. Weather patterns'],
      answer: 'B',
      solution: { analysis: '讲座开头明确说明主题是water cycle（水循环），后续内容围绕蒸发、凝结、降水展开。' },
      difficulty: 3,
    },
  ],
};

// ========== 法律基础题目样本 ==========
const LAW_QUESTIONS = {
 宪法: [
    {
      type: 'choice',
      section: '宪法',
      stem: '根据我国宪法，中华人民共和国的一切权力属于（　）。\nA. 人民\nB. 国务院\nC. 全国人民代表大会\nD. 最高人民法院',
      options: ['A. 人民', 'B. 国务院', 'C. 全国人民代表大会', 'D. 最高人民法院'],
      answer: 'A',
      solution: { analysis: '《宪法》第2条规定：中华人民共和国的一切权力属于人民。人民行使国家权力的机关是全国人民代表大会和地方各级人民代表大会。' },
      difficulty: 2,
    },
    {
      type: 'choice',
      section: '宪法',
      stem: '我国现行宪法是（　）年颁布的。\nA. 1954\nB. 1978\nC. 1982\nD. 1999',
      options: ['A. 1954', 'B. 1978', 'C. 1982', 'D. 1999'],
      answer: 'C',
      solution: { analysis: '我国现行宪法是1982年12月4日第五届全国人民代表大会第五次会议通过的，此后历经1988、1993、1999、2004、2018年五次修正。' },
      difficulty: 2,
    },
  ],
  民法: [
    {
      type: 'choice',
      section: '民法',
      stem: '根据《民法典》，完全民事行为能力的年龄下限是（　）周岁。\nA. 16\nB. 18\nC. 20\nD. 22',
      options: ['A. 16', 'B. 18', 'C. 20', 'D. 22'],
      answer: 'B',
      solution: { analysis: '《民法典》第17条：十八周岁以上的自然人为成年人，具有完全民事行为能力。16周岁以上以自己劳动收入为主要生活来源的，视为完全民事行为能力人。' },
      difficulty: 2,
    },
    {
      type: 'choice',
      section: '民法',
      stem: '诉讼时效期间一般为（　）年。\nA. 1\nB. 2\nC. 3\nD. 20',
      options: ['A. 1', 'B. 2', 'C. 3', 'D. 20'],
      answer: 'C',
      solution: { analysis: '《民法典》第188条：向人民法院请求保护民事权利的诉讼时效期间为三年。法律另有规定的，依照其规定。' },
      difficulty: 3,
    },
  ],
  刑法: [
    {
      type: 'choice',
      section: '刑法',
      stem: '以下哪种情形不构成犯罪？\nA. 故意杀人的\nB. 盗窃公私财物的\nC. 正当防卫超过必要限度的\nD. 因不可抗力造成损害的',
      options: ['A. 故意杀人的', 'B. 盗窃公私财物的', 'C. 正当防卫超过必要限度的', 'D. 因不可抗力造成损害的'],
      answer: 'D',
      solution: { analysis: '《刑法》第16条：行为在客观上虽然造成了损害结果，但是不是出于故意或者过失，而是由于不能抗拒或者不能预见的原因所引起的，不是犯罪。' },
      difficulty: 3,
    },
  ],
};

// ========== 大学通识课题目样本 ==========
const UNIV_QUESTIONS = {
  高等数学: [
    {
      type: 'choice',
      section: '极限与连续',
      stem: '极限 lim(x→0) sin(x)/x = （　）\nA. 0\nB. 1\nC. ∞\nD. 不存在',
      options: ['A. 0', 'B. 1', 'C. ∞', 'D. 不存在'],
      answer: 'B',
      solution: { analysis: '重要极限：lim(x→0) sin(x)/x = 1。这是微积分基本极限之一，可用夹逼定理证明。' },
      difficulty: 2,
    },
    {
      type: 'choice',
      section: '导数与微分',
      stem: '函数 f(x) = x³ - 3x 的极小值为（　）\nA. -2\nB. 2\nC. -1\nD. 1',
      options: ['A. -2', 'B. 2', 'C. -1', 'D. 1'],
      answer: 'A',
      solution: { analysis: '求导：f\'(x) = 3x² - 3 = 3(x+1)(x-1)。令f\'(x)=0得x=±1。f\'\'(1) = 6 > 0，故x=1处取极小值，f(1) = 1-3 = -2。' },
      difficulty: 3,
    },
  ],
  大学语文: [
    {
      type: 'choice',
      section: '文言文',
      stem: '"学而时习之，不亦说乎"出自（　）\nA. 《论语》\nB. 《孟子》\nC. 《大学》\nD. 《中庸》',
      options: ['A. 《论语》', 'B. 《孟子》', 'C. 《大学》', 'D. 《中庸》'],
      answer: 'A',
      solution: { analysis: '此句出自《论语·学而》，是孔子关于学习的名言。"说"通"悦"，意为高兴、愉快。' },
      difficulty: 2,
    },
    {
      type: 'choice',
      section: '古诗词',
      stem: '"长风破浪会有时，直挂云帆济沧海"的作者是（　）\nA. 杜甫\nB. 李白\nC. 白居易\nD. 王维',
      options: ['A. 杜甫', 'B. 李白', 'C. 白居易', 'D. 王维'],
      answer: 'B',
      solution: { analysis: '此句出自李白《行路难·其一》，表达了诗人积极进取、乐观自信的人生态度。' },
      difficulty: 2,
    },
  ],
  思想道德修养: [
    {
      type: 'choice',
      section: '人生观',
      stem: '人生观的核心是（　）\nA. 人生目的\nB. 人生态度\nC. 人生价值\nD. 人生理想',
      options: ['A. 人生目的', 'B. 人生态度', 'C. 人生价值', 'D. 人生理想'],
      answer: 'A',
      solution: { analysis: '人生观包括人生目的、人生态度、人生价值三个方面，其中人生目的是核心，决定人生态度和人生价值选择。' },
      difficulty: 2,
    },
  ],
};

// ========== 论文写作指导 ==========
const PAPER_GUIDES = [
  {
    type: 'essay',
    section: '论文选题',
    stem: '学术论文选题的原则有哪些？请简要说明。',
    answer: '选题原则：1. 创新性原则 2. 可行性原则 3. 价值性原则 4. 适中性原则。选题应具有一定的学术价值和现实意义，同时要考虑研究者的知识储备和时间精力。',
    solution: { analysis: '好的选题是论文成功的一半。创新 ≠ 全新，可以是新角度、新方法、新材料。可行性需考虑资料获取、研究方法掌握程度。' },
    difficulty: 3,
  },
  {
    type: 'essay',
    section: '论文结构',
    stem: '一篇标准学术论文的基本结构包括哪些部分？',
    answer: '基本结构：1. 标题 2. 摘要（中英文）3. 关键词 4. 引言/绪论 5. 正文（文献综述、研究方法、分析讨论）6. 结论 7. 参考文献 8. 致谢（可选）',
    solution: { analysis: '摘要需包含研究目的、方法、结果、结论四要素，200-300字。参考文献按GB/T 7714-2015格式著录。' },
    difficulty: 2,
  },
  {
    type: 'essay',
    section: '引用规范',
    stem: '学术引用中，直接引用和间接引用的区别是什么？如何正确标注？',
    answer: '直接引用：照搬原文，需加引号并注明页码。间接引用：概括转述，需注明出处。标注格式：(作者，年份：页码) 或上标序号。',
    solution: { analysis: '引用规范是学术诚信的基础。直接引用不超过全文10%，过多会影响原创性评分。建议多使用间接引用并加入自己的分析。' },
    difficulty: 3,
  },
  {
    type: 'essay',
    section: '查重模拟',
    stem: '学术论文查重时，哪些情况会被判定为抄袭？如何避免？',
    answer: '抄袭判定：1. 大段复制未标注 2. 改写但仍与原作品高度相似 3. 自我抄袭（重复发表自己作品）4. 翻译外文未标注。避免方法：规范引用、使用查重工具自检、保持原创表达。',
    solution: { analysis: '一般学校要求查重率低于15%-20%。改写时需注意：改变句式结构、替换同义词、加入自己的分析和评论。' },
    difficulty: 4,
  },
];

// ========== 导出 ==========
const output = {
  subjects: SUBJECTS,
  questions: {
    CET4: [...CET4_QUESTIONS.listening, ...CET4_QUESTIONS.reading, ...CET4_QUESTIONS.cloze, ...CET4_QUESTIONS.translation, ...CET4_QUESTIONS.writing],
    CET6: [...CET6_QUESTIONS.reading, ...CET6_QUESTIONS.translation],
    IELTS: [...IELTS_QUESTIONS.writing, ...IELTS_QUESTIONS.reading],
    TOEFL: [...TOEFL_QUESTIONS.reading, ...TOEFL_QUESTIONS.listening],
    LAW: [...LAW_QUESTIONS.宪法, ...LAW_QUESTIONS.民法, ...LAW_QUESTIONS.刑法],
    UNIV: [...UNIV_QUESTIONS.高等数学, ...UNIV_QUESTIONS.大学语文, ...UNIV_QUESTIONS.思想道德修养],
    PAPER: PAPER_GUIDES,
  },
  templates: {
    CET4: {
      name: 'CET-4 全真模拟卷',
      totalScore: 710,
      duration: 125,
      sections: [
        { name: '听力理解', type: 'listening', count: 25, scorePer: 15 },
        { name: '阅读理解', type: 'choice', count: 15, scorePer: 10 },
        { name: '翻译', type: 'fill', count: 1, scorePer: 15 },
        { name: '写作', type: 'essay', count: 1, scorePer: 15 },
      ],
    },
    CET6: {
      name: 'CET-6 全真模拟卷',
      totalScore: 710,
      duration: 130,
      sections: [
        { name: '听力理解', type: 'listening', count: 25, scorePer: 15 },
        { name: '仔细阅读', type: 'choice', count: 10, scorePer: 10 },
        { name: '翻译', type: 'fill', count: 1, scorePer: 15 },
        { name: '写作', type: 'essay', count: 1, scorePer: 15 },
      ],
    },
    IELTS: {
      name: '雅思全真模拟',
      totalScore: 9,
      duration: 240,
      sections: [
        { name: '听力', type: 'listening', count: 40, scorePer: 1 },
        { name: '阅读', type: 'choice', count: 40, scorePer: 1 },
        { name: '写作Task1', type: 'essay', count: 1, scorePer: 0.5 },
        { name: '写作Task2', type: 'essay', count: 1, scorePer: 1 },
      ],
    },
    TOEFL: {
      name: '托福全真模拟',
      totalScore: 120,
      duration: 180,
      sections: [
        { name: '阅读', type: 'choice', count: 10, scorePer: 3 },
        { name: '听力', type: 'listening', count: 8, scorePer: 3 },
        { name: '口语', type: 'essay', count: 4, scorePer: 2 },
        { name: '写作', type: 'essay', count: 2, scorePer: 3 },
      ],
    },
    LAW: {
      name: '法律基础期末模拟',
      totalScore: 100,
      duration: 120,
      sections: [
        { name: '宪法', type: 'choice', count: 10, scorePer: 3 },
        { name: '民法', type: 'choice', count: 10, scorePer: 3 },
        { name: '刑法', type: 'choice', count: 10, scorePer: 3 },
        { name: '案例分析', type: 'essay', count: 2, scorePer: 10 },
      ],
    },
    UNIV: {
      name: '大学通识课期末模拟',
      totalScore: 100,
      duration: 120,
      sections: [
        { name: '高等数学', type: 'choice', count: 10, scorePer: 4 },
        { name: '大学语文', type: 'choice', count: 10, scorePer: 3 },
        { name: '思修', type: 'choice', count: 10, scorePer: 3 },
        { name: '近代史', type: 'choice', count: 10, scorePer: 3 },
      ],
    },
    PAPER: {
      name: '论文写作指导',
      totalScore: 0,
      duration: 0,
      sections: [
        { name: '选题指导', type: 'essay', count: 1, scorePer: 0 },
        { name: '结构规范', type: 'essay', count: 1, scorePer: 0 },
        { name: '引用规范', type: 'essay', count: 1, scorePer: 0 },
        { name: '查重避坑', type: 'essay', count: 1, scorePer: 0 },
      ],
    },
  },
};

// 写入文件
const outputPath = path.join(__dirname, 'seed-undergraduate.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`✅ 已生成: ${outputPath}`);
console.log(`📊 科目数: ${SUBJECTS.length}`);
console.log(`📝 题目数: ${Object.entries(output.questions).reduce((sum, [k, v]) => sum + v.length, 0)}`);
