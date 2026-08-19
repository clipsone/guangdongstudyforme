// 本科模式科目 + 基础题目种子
// 包含：CET-4、CET-6、雅思、托福、法律基础、大学通识课、论文写作

const SUBJECTS = [
  { code: 'CET4', name: '大学英语四级', desc: 'CET-4 备考：听力、阅读、完形、翻译、写作' },
  { code: 'CET6', name: '大学英语六级', desc: 'CET-6 备考：难度高于四级，含长篇阅读' },
  { code: 'IELTS', name: '雅思 IELTS', desc: '雅思考试：听说读写四项模拟' },
  { code: 'TOEFL', name: '托福 TOEFL', desc: '托福考试：学术英语能力测试' },
  { code: 'LAW', name: '法律基础', desc: '宪法、民法、刑法基础知识点' },
  { code: 'UNIV', name: '大学通识课', desc: '高等数学、大学语文、思修、近代史' },
  { code: 'PAPER', name: '论文写作', desc: '选题、结构、引用规范、查重避坑' },
];

const QUESTIONS = {
  CET4: [
    // 听力
    { type:'choice', section:'听力理解', stem:'(听力原文) "The concert starts at 7:30 pm. Please arrive 15 minutes early to get good seats."\n问题：音乐会几点开始？', options:['A. 7:00 pm','B. 7:15 pm','C. 7:30 pm','D. 7:45 pm'], answer:'C', solution:{analysis:'原文明确说音乐会7:30开始，提前15分钟到达。'}},
    { type:'choice', section:'听力理解', stem:'(听力原文) "I\'m sorry I broke your vase. I\'ll pay for it."\n问题：男士想做什么？', options:['A. 买一个新花瓶','B. 赔偿损失','C. 道歉但不赔偿','D. 离开房间'], answer:'B', solution:{analysis:'I\'ll pay for it = 我会赔偿，表示愿意承担损失。'}},
    // 阅读
    { type:'choice', section:'阅读理解', stem:'Passage: "Many college students work part-time jobs while studying. This can help them gain practical experience and earn money for tuition. However, working too many hours may affect their academic performance."\n问题：文章主要讨论什么？', options:['A. 大学生兼职的利弊','B. 大学学费的上涨','C. 如何找到好工作','D. 学业的重要性'], answer:'A', solution:{analysis:'文章既提到兼职的好处（经验和收入），也提到可能影响学业，故为利弊讨论。'}},
    { type:'choice', section:'阅读理解', stem:'Passage: "The Internet has changed the way people shop. Online stores offer convenience and lower prices. However, some people miss the experience of shopping in physical stores."\n问题：关于网购，下列说法正确的是？', options:['A. 网购价格更高','B. 实体店已消失','C. 网购有便利但也有劣势','D. 没有人喜欢网购'], answer:'C', solution:{analysis:'文章提到网购的便利性也提到有人怀念实体店体验，故选C。'}},
    // 翻译
    { type:'fill', section:'翻译', stem:'将以下句子翻译成英文：\n1. 中国是世界上人口最多的国家。\n2. 保护环境是我们每个人的责任。', answer:'1. China is the most populous country in the world. 2. Protecting the environment is everyone\'s responsibility.', solution:{analysis:'①"最多人口"用most populous；②"责任"用responsibility，动名词作主语。'}},
    // 写作
    { type:'essay', section:'写作', stem:'Write an essay (120-180 words) on "The Importance of Time Management for College Students".', answer:'要点：1. 时间管理定义 2. 对学习和生活的益处 3. 具体方法建议', solution:{analysis:'范文结构：开头定义→主体段落论述好处（提高效率、减少压力）→结尾建议（制定计划表、优先排序）。使用Firstly/Secondly/Finally衔接。'}},
  ],
  CET6: [
    { type:'choice', section:'仔细阅读', stem:'Passage: "Artificial intelligence is reshaping industries worldwide. While AI can increase efficiency and reduce costs, it also raises concerns about job displacement and algorithmic bias. Experts argue that regulatory frameworks must evolve to address these challenges."\n问题：专家的主要担忧是什么？', options:['A. AI成本过高','B. AI可能导致失业和偏见','C. AI技术不成熟','D. AI无法应用'], answer:'B', solution:{analysis:'原文提到 job displacement（失业）和 algorithmic bias（算法偏见），故选B。'}},
    { type:'fill', section:'翻译', stem:'Translate: 改革开放以来，中国经济快速发展，人民生活水平显著提高。', answer:'Since the reform and opening-up, China\'s economy has developed rapidly, and people\'s living standards have improved significantly.', solution:{analysis:'①"改革开放"用reform and opening-up；②"显著提高"用improved significantly；③注意时态用现在完成时。'}},
  ],
  IELTS: [
    { type:'essay', section:'写作 Task 2', stem:'Some people think that university education should be free for all students. Others believe that students should pay for their own education.\n\nDiscuss both views and give your opinion. (250+ words)', answer:'写作要点：①双方观点概述 ②免费教育的优势（公平、人才培养）③收费的理由（个人责任、资源有限）④个人观点', solution:{analysis:'雅思Task 2评分：任务回应(25%)、连贯衔接(25%)、词汇(25%)、语法(25%)。需用However/Nevertheless/In contrast等连接词。'}},
    { type:'choice', section:'阅读', stem:'The passage states that cognitive load theory distinguishes between intrinsic load, extraneous load, and germane load. Which type of load should teachers aim to minimize?\nA. Intrinsic load\nB. Extraneous load\nC. Germane load\nD. All three', answer:'B', solution:{analysis:'Extraneous load是无关认知负荷，由不当教学设计产生，应最小化。Intrinsic是材料本身难度，Germane是有效学习负荷。'}},
  ],
  TOEFL: [
    { type:'choice', section:'阅读', stem:'According to the lecture, what is the main advantage of mutualism in ecosystems?\nA. It increases competition\nB. It promotes species survival\nC. It reduces biodiversity\nD. It creates new predators', answer:'B', solution:{analysis:'共生关系(mutualism)的优势是促进物种生存(survival)，双方互利。'}},
    { type:'listening', section:'听力讲座', stem:'Listen: "The Industrial Revolution began in Britain in the late 18th century..." \n问题：工业革命最早发生在哪个国家？', options:['A. France','B. Germany','C. Britain','D. America'], answer:'C', solution:{analysis:'原文明确说Industrial Revolution began in Britain。'}},
  ],
  LAW: [
    { type:'choice', section:'宪法', stem:'我国现行宪法是（　）年颁布的。', options:['A. 1954','B. 1978','C. 1982','D. 1988'], answer:'C', solution:{analysis:'我国现行宪法是1982年12月4日第五届全国人大五次会议通过，此后历经五次修正。'}},
    { type:'choice', section:'宪法', stem:'根据宪法，中华人民共和国的一切权力属于（　）。', options:['A. 人民','B. 全国人大','C. 国务院','D. 党中央'], answer:'A', solution:{analysis:'《宪法》第2条：中华人民共和国的一切权力属于人民。'}},
    { type:'choice', section:'民法', stem:'完全民事行为能力的年龄下限是（　）周岁。', options:['A. 16','B. 18','C. 20','D. 22'], answer:'B', solution:{analysis:'《民法典》第17条：十八周岁以上的自然人为成年人，具有完全民事行为能力。16周岁以上以自己劳动收入为主要生活来源的，视为完全民事行为能力人。'}},
    { type:'choice', section:'民法', stem:'诉讼时效期间一般为（　）年。', options:['A. 1','B. 2','C. 3','D. 20'], answer:'C', solution:{analysis:'《民法典》第188条：向人民法院请求保护民事权利的诉讼时效期间为三年。'}},
    { type:'choice', section:'刑法', stem:'以下哪种情形不构成犯罪？', options:['A. 故意杀人','B. 盗窃财物','C. 正当防卫超限','D. 不可抗力造成损害'], answer:'D', solution:{analysis:'《刑法》第16条：因不可抗力造成损害的，不是犯罪。'}},
  ],
  UNIV: [
    { type:'choice', section:'高等数学·极限', stem:'极限 lim(x→0) sin(x)/x = （　）', options:['A. 0','B. 1','C. ∞','D. 不存在'], answer:'B', solution:{analysis:'重要极限：lim(x→0) sin(x)/x = 1，可用夹逼定理证明。'}},
    { type:'choice', section:'高等数学·导数', stem:'函数 f(x) = x³ - 3x 的极小值为（　）', options:['A. -2','B. 2','C. -1','D. 1'], answer:'A', solution:{analysis:'求导f\'(x)=3x²-3=3(x+1)(x-1)，令f\'(x)=0得x=±1。f\'\'(1)=6>0，极小值f(1)=-2。'}},
    { type:'choice', section:'大学语文', stem:'"学而时习之，不亦说乎"出自（　）', options:['A.《论语》','B.《孟子》','C.《大学》','D.《中庸》'], answer:'A', solution:{analysis:'此句出自《论语·学而》，"说"通"悦"。'}},
    { type:'choice', section:'大学语文', stem:'"长风破浪会有时，直挂云帆济沧海"的作者是（　）', options:['A.杜甫','B.李白','C.白居易','D.王维'], answer:'B', solution:{analysis:'出自李白《行路难·其一》，表达积极进取的人生态度。'}},
    { type:'choice', section:'思想道德修养', stem:'人生观的核心是（　）', options:['A.人生目的','B.人生态度','C.人生价值','D.人生理想'], answer:'A', solution:{analysis:'人生观包括人生目的、态度、价值三方面，其中人生目的是核心。'}},
  ],
  PAPER: [
    { type:'essay', section:'论文选题', stem:'学术论文选题的基本原则有哪些？', answer:'1. 创新性原则 2. 可行性原则 3. 价值性原则 4. 适中性原则', solution:{analysis:'好的选题=创新+可行+有价值。创新不一定是全新领域，新角度新方法也算创新。'}},
    { type:'essay', section:'论文结构', stem:'一篇标准学术论文的基本结构包括哪些部分？', answer:'标题→摘要(中英文)→关键词→引言→正文→结论→参考文献→致谢', solution:{analysis:'摘要需含目的、方法、结果、结论四要素，200-300字。参考文献按GB/T 7714-2015格式。'}},
    { type:'essay', section:'引用规范', stem:'直接引用和间接引用的区别是什么？如何标注？', answer:'直接引用照搬原文加引号并注页码；间接引用概括转述并注出处。格式：(作者，年份：页码)或上标序号。', solution:{analysis:'直接引用不超全文10%，过多影响原创性。建议多间接引用并加入分析评论。'}},
    { type:'essay', section:'查重避坑', stem:'哪些情况会被判定为抄袭？如何避免？', answer:'抄袭：大段复制未标注、改写仍高度相似、自我抄袭。避免：规范引用、查重自检、原创表达。', solution:{analysis:'学校通常要求查重率<15-20%。改写时改变句式、换同义词、加自己分析。'}}
  ]
};

const TEMPLATES = {
  CET4: { name:'CET-4 全真模拟卷', totalScore:710, duration:125, sections:[
    {name:'听力理解',type:'listening',count:25,scorePer:15},
    {name:'阅读理解',type:'choice',count:15,scorePer:10},
    {name:'翻译',type:'fill',count:1,scorePer:15},
    {name:'写作',type:'essay',count:1,scorePer:15},
  ]},
  CET6: { name:'CET-6 全真模拟卷', totalScore:710, duration:130, sections:[
    {name:'听力理解',type:'listening',count:25,scorePer:15},
    {name:'仔细阅读',type:'choice',count:10,scorePer:10},
    {name:'翻译',type:'fill',count:1,scorePer:15},
    {name:'写作',type:'essay',count:1,scorePer:15},
  ]},
  IELTS: { name:'雅思全真模拟', totalScore:9, duration:240, sections:[
    {name:'听力',type:'listening',count:40,scorePer:1},
    {name:'阅读',type:'choice',count:40,scorePer:1},
    {name:'写作Task1',type:'essay',count:1,scorePer:0},
    {name:'写作Task2',type:'essay',count:1,scorePer:1},
  ]},
  TOEFL: { name:'托福全真模拟', totalScore:120, duration:180, sections:[
    {name:'阅读',type:'choice',count:10,scorePer:3},
    {name:'听力',type:'listening',count:8,scorePer:3},
    {name:'口语',type:'essay',count:4,scorePer:2},
    {name:'写作',type:'essay',count:2,scorePer:3},
  ]},
  LAW: { name:'法律基础期末模拟', totalScore:100, duration:120, sections:[
    {name:'宪法',type:'choice',count:10,scorePer:3},
    {name:'民法',type:'choice',count:10,scorePer:3},
    {name:'刑法',type:'choice',count:10,scorePer:3},
    {name:'案例分析',type:'essay',count:2,scorePer:10},
  ]},
  UNIV: { name:'大学通识课期末模拟', totalScore:100, duration:120, sections:[
    {name:'高等数学',type:'choice',count:10,scorePer:4},
    {name:'大学语文',type:'choice',count:10,scorePer:3},
    {name:'思修',type:'choice',count:10,scorePer:3},
    {name:'近代史',type:'choice',count:10,scorePer:3},
  ]},
  PAPER: { name:'论文写作指导', totalScore:0, duration:0, sections:[
    {name:'选题指导',type:'essay',count:1,scorePer:0},
    {name:'结构规范',type:'essay',count:1,scorePer:0},
    {name:'引用规范',type:'essay',count:1,scorePer:0},
    {name:'查重避坑',type:'essay',count:1,scorePer:0},
  ]},
};

export { SUBJECTS, QUESTIONS, TEMPLATES };
