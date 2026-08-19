import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const SEED_DIR = path.join(__dirname, '..', 'seed');

// 清空业务数据（保留 User / Subject，便于重复导入）
async function resetData() {
  const tables = [
    'ExerciseQuestion', 'ExamQuestion', 'QuestionKnowledge', 'WrongQuestion',
    'RecitationRecord', 'StudySession', 'StudyTask', 'MasterySnapshot',
    'DiagnosticRecord', 'EssayReview', 'Essay', 'ChatRecord', 'UserAchievement',
    'Exam', 'ExamTemplate', 'RecitationItem', 'Question', 'WeeklyReport',
    'KnowledgePoint', 'Achievement', 'Chapter'
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  console.log('🧹 已清空旧业务数据（知识图谱/题目/背诵/任务/记录）');
}

async function main() {
  console.log('🌱 开始种子数据导入...');
  await resetData();

  // 1. 创建默认用户（密码为 bcrypt 哈希；如需自定义，先设环境变量 SEED_USER_PASSWORD）
  const seedPassword = process.env.SEED_USER_PASSWORD || 'password123';
  const user = await prisma.user.upsert({
    where: { username: 'student' },
    update: { passwordHash: bcrypt.hashSync(seedPassword, 10) },
    create: {
      username: 'student',
      email: 'student@example.com',
      passwordHash: bcrypt.hashSync(seedPassword, 10),
      examDate: new Date('2027-01-10')
    }
  });
  console.log('✅ 默认用户创建成功:', user.username);

  // 2. 创建科目
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { code: 'Y' },
      update: {},
      create: {
        name: '语文',
        code: 'Y',
        description: '语文科目'
      }
    }),
    prisma.subject.upsert({
      where: { code: 'M' },
      update: {},
      create: {
        name: '数学',
        code: 'M',
        description: '数学科目'
      }
    }),
    prisma.subject.upsert({
      where: { code: 'E' },
      update: {},
      create: {
        name: '英语',
        code: 'E',
        description: '英语科目'
      }
    })
  ]);
  console.log('✅ 科目创建成功');

  // 3. 导入知识图谱
  const knowledgePath = path.join(SEED_DIR, 'seed-knowledge.json');
  if (fs.existsSync(knowledgePath)) {
    const knowledgeData = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));

    // 兼容两种格式：扁平数组 或 { knowledgeGraph: { chinese: [...], math: [...], english: [...] } }
    const raw = knowledgeData.knowledgeGraph || knowledgeData;
    const SUBJECT_CODE_MAP = { chinese: 'Y', math: 'M', english: 'E' };
    const knowledgePoints = Array.isArray(raw)
      ? raw
      : Object.entries(raw).flatMap(([subjKey, arr]) => {
          const sc = SUBJECT_CODE_MAP[subjKey] || subjKey.toUpperCase();
          return arr.map((p) => ({ ...p, subjectCode: sc }));
        });

    for (const subject of subjects) {
      const subjectChapters = knowledgePoints.filter(kp => kp.subjectCode === subject.code && kp.level === 1);

      for (const chapter of subjectChapters) {
        const dbChapter = await prisma.chapter.upsert({
          where: { code: chapter.code },
          update: {},
          create: {
            subjectId: subject.id,
            name: chapter.name,
            code: chapter.code,
            order: chapter.order || 0,
            description: chapter.description || ''
          }
        });

        // 创建考点和子考点
        const subKps = knowledgePoints.filter(kp =>
          kp.subjectCode === subject.code &&
          (kp.code === chapter.code || kp.code.startsWith(chapter.code + '-'))
        );

        for (const kp of subKps) {
          if (kp.level === 1) continue; // 跳过章节

          const parentKp = kp.level === 3 && kp.parentId
            ? await prisma.knowledgePoint.findFirst({
                where: { code: kp.parentId }
              })
            : null;

          await prisma.knowledgePoint.upsert({
            where: { code: kp.code },
            update: {},
            create: {
              chapterId: dbChapter.id,
              code: kp.code,
              name: kp.name,
              level: kp.level,
              parentId: parentKp?.id || null,
              frequency: kp.frequency || 0,
              difficulty: kp.difficulty || 3,
              status: kp.status || 'pending',
              mark: kp.mark || 'none',
              prerequisites: kp.prerequisites || [],
              mastery: kp.mastery || 0
            }
          });
        }
      }
    }
    console.log('✅ 知识图谱导入成功');
  }

  // 4. 导入题目
  async function importQuestions(questionsData, label) {
    let count = 0;
    for (const q of questionsData) {
      const subject = subjects.find(s => s.code === q.subjectCode);
      if (!subject) continue;

      const question = await prisma.question.create({
        data: {
          subjectId: subject.id,
          type: q.type,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          solution: q.solution,
          difficulty: q.difficulty || 3,
          source: q.source,
          year: q.year,
          status: q.status || 'active'
        }
      });

      // 关联知识点
      if (q.knowledgePointIds && q.knowledgePointIds.length > 0) {
        for (const kpCode of q.knowledgePointIds) {
          const kp = await prisma.knowledgePoint.findFirst({
            where: { code: kpCode }
          });
          if (kp) {
            await prisma.questionKnowledge.create({
              data: {
                questionId: question.id,
                knowledgePointId: kp.id
              }
            });
          }
        }
      }
      count++;
    }
    console.log(`✅ ${label}: ${count} 题`);
  }

  const questionsPath = path.join(SEED_DIR, 'seed-questions.json');
  if (fs.existsSync(questionsPath)) {
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
    await importQuestions(questionsData, '题目导入成功');
  }

  const mathPath = path.join(SEED_DIR, 'seed-questions-math.json');
  if (fs.existsSync(mathPath)) {
    const mathData = JSON.parse(fs.readFileSync(mathPath, 'utf-8'));
    await importQuestions(mathData, '数学题目导入成功');
  }

  const extraPath = path.join(SEED_DIR, 'seed-questions-extra.json');
  if (fs.existsSync(extraPath)) {
    const extraData = JSON.parse(fs.readFileSync(extraPath, 'utf-8'));
    await importQuestions(extraData, '语文/英语补充题目导入成功');
  }

  // 5. 导入背诵项目
  const recitationPath = path.join(SEED_DIR, 'seed-recitation.json');
  if (fs.existsSync(recitationPath)) {
    const recitationData = JSON.parse(fs.readFileSync(recitationPath, 'utf-8'));

    for (const item of recitationData) {
      const subject = subjects.find(s => s.code === item.subjectCode);
      if (!subject) continue;

      await prisma.recitationItem.create({
        data: {
          subjectId: subject.id,
          category: item.type,
          content: item.content,
          title: item.title,
          phonetic: item.phonetic,
          partOfSpeech: item.partOfSpeech,
          meaning: item.meaning,
          example: item.example,
          order: item.order || 0
        }
      });
    }
    console.log('✅ 背诵项目导入成功');
  }

  // 6. 创建每日任务示例
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.studyTask.createMany({
    data: [
      {
        userId: user.id,
        type: 'exercise',
        title: '完成数学练习20题',
        description: '重点练习复数和逻辑用语',
        targetCount: 20,
        dueDate: today
      },
      {
        userId: user.id,
        type: 'recitation',
        title: '背诵《劝学》全文',
        description: '第1次背诵',
        targetCount: 1,
        dueDate: today
      },
      {
        userId: user.id,
        type: 'review',
        title: '复习错题本5题',
        description: '重点复习函数相关错题',
        targetCount: 5,
        dueDate: today
      }
    ]
  });
  console.log('✅ 每日任务创建成功');

  // 7. 创建模考模板（按广东春季高考真实结构：语文/数学/英语各 150 分）
  const TEMPLATES = {
    Y: {
      name: '语文·春季高考仿真卷',
      description: '按广东春季高考（合格考）真实结构：基础知识与运用约33分 / 古诗文阅读20分（文言文翻译4+理解填空6、诗歌鉴赏4+6）/ 现代文阅读40分（论述类+文学类，含主观题）/ 写作60分。150分/120分钟',
      totalScore: 150, duration: 120,
      sections: [
        { name: '基础知识与运用', type: 'choice', count: 6, scorePer: 4 },
        { name: '名句名篇默写', type: 'fill', count: 3, scorePer: 2 },
        { name: '文言文翻译', type: 'essay', count: 1, scorePer: 4 },
        { name: '文言文理解填空', type: 'fill', count: 1, scorePer: 6 },
        { name: '诗歌鉴赏·手法', type: 'essay', count: 1, scorePer: 4 },
        { name: '诗歌鉴赏·意境情感', type: 'essay', count: 1, scorePer: 6 },
        { name: '现代文阅读·论述类', type: 'choice', count: 4, scorePer: 3 },
        { name: '现代文阅读·论述类主观题', type: 'essay', count: 1, scorePer: 8 },
        { name: '现代文阅读·文学类', type: 'choice', count: 4, scorePer: 3 },
        { name: '现代文阅读·文学类赏析', type: 'essay', count: 1, scorePer: 8 },
        { name: '写作', type: 'essay', count: 1, scorePer: 60 },
      ],
    },
    M: {
      name: '数学·春季高考仿真卷',
      description: '按广东春季高考真实结构（90分钟/150分）：选择题12题×6分 + 填空题6题×6分 + 解答题4题（19-21题各10分、22题12分）',
      totalScore: 150, duration: 90,
      sections: [
        { name: '选择题', type: 'choice', count: 12, scorePer: 6 },
        { name: '填空题', type: 'fill', count: 6, scorePer: 6 },
        { name: '解答题（19-21题）', type: 'essay', count: 3, scorePer: 10 },
        { name: '解答题（22题）', type: 'essay', count: 1, scorePer: 12 },
      ],
    },
    E: {
      name: '英语·春季高考仿真卷',
      description: '按广东春季高考真实结构（90分钟/150分）：情景交际15 + 阅读理解60（第一节45+五选五15）+ 完形填空30 + 语法填空20 + 书面表达25',
      totalScore: 150, duration: 90,
      sections: [
        { name: '情景交际', type: 'choice', count: 5, scorePer: 3 },
        { name: '阅读理解·第一节', type: 'choice', count: 15, scorePer: 3 },
        { name: '阅读理解·第二节', type: 'fill', count: 5, scorePer: 3 },
        { name: '完形填空', type: 'choice', count: 15, scorePer: 2 },
        { name: '语法填空', type: 'fill', count: 10, scorePer: 2 },
        { name: '书面表达', type: 'essay', count: 1, scorePer: 25 },
      ],
    },
  };

  for (const subject of subjects) {
    const tpl = TEMPLATES[subject.code];
    if (!tpl) continue;
    await prisma.examTemplate.upsert({
      where: { id: `template-${subject.code}` },
      update: {},
      create: {
        id: `template-${subject.code}`,
        subjectId: subject.id,
        name: tpl.name,
        description: tpl.description,
        config: { sections: tpl.sections },
        totalScore: tpl.totalScore,
        duration: tpl.duration
      }
    });
  }
  console.log('✅ 模考模板创建成功（三科均 150 分，按真实结构）');

  // 8. 创建成就徽章
  const achievements = [
    { name: '初试锋芒', icon: '🎯', description: '完成第 1 次练习', condition: { type: 'first_exercise' } },
    { name: '刷题达人', icon: '📚', description: '累计完成 10 次练习', condition: { type: 'exercise_10' } },
    { name: '百题斩', icon: '⚔️', description: '累计答对 100 题', condition: { type: 'questions_100' } },
    { name: '错题清零', icon: '🧹', description: '错题本全部消化', condition: { type: 'wrong_mastered' } },
    { name: '背诵启航', icon: '📖', description: '完成第 1 次背诵打卡', condition: { type: 'recitation_first' } },
    { name: '记忆大师', icon: '🧠', description: '累计背诵打卡 10 次', condition: { type: 'recitation_10' } },
    { name: '自律之星', icon: '🗓️', description: '完成第 1 个每日任务', condition: { type: 'task_first' } },
    { name: '模考首战', icon: '🏁', description: '完成第 1 次全真模考', condition: { type: 'exam_first' } },
    { name: '科目精通', icon: '🏆', description: '任一科目掌握度达 80%', condition: { type: 'subject_mastered' } }
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { name: a.name },
      update: {},
      create: { name: a.name, icon: a.icon, description: a.description, condition: a.condition }
    });
  }
  console.log('✅ 成就徽章创建成功');

  console.log('🎉 种子数据导入完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据导入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });