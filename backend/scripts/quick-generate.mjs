/**
 * 快速批量生成本科题目（每轮生成少量，避免超时）
 */
import { PrismaClient } from '@prisma/client';
import { chat } from '../src/services/aiProvider.js';

const prisma = new PrismaClient();

const SUBJECTS = {
  CET4: { name: 'CET-4', target: 50, sections: ['听力理解', '阅读理解'] },
  CET6: { name: 'CET-6', target: 30, sections: ['仔细阅读'] },
  IELTS: { name: '雅思', target: 20, sections: ['阅读', '写作 Task 2'] },
  TOEFL: { name: '托福', target: 20, sections: ['阅读', '听力讲座'] },
  LAW: { name: '法律', target: 40, sections: ['宪法', '民法', '刑法'] },
  UNIV: { name: '通识课', target: 30, sections: ['大学语文', '高等数学·极限'] },
};

async function generateBatch(subjectCode, section, count, prompt) {
  const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
  if (!subject) return [];

  const existing = await prisma.question.count({
    where: { subjectId: subject.id, section }
  });

  const need = Math.max(0, count - existing);
  if (need <= 0) return [];

  const questions = [];
  for (let i = 0; i < need; i++) {
    try {
      const text = await chat([
        { role: 'system', content: '你是专业命题专家，只输出合法JSON。' },
        { role: 'user', content: prompt },
      ], { temperature: 0.8, maxTokens: 400 });

      const raw = parseJson(text);
      if (!raw || !raw.stem) continue;

      questions.push({
        subjectId: subject.id,
        type: raw.options ? 'choice' : 'essay',
        section,
        stem: raw.stem.trim(),
        options: raw.options || null,
        answer: (raw.answer || '').trim(),
        solution: { analysis: (raw.analysis || '').trim() },
        difficulty: Math.floor(Math.random() * 2) + 3,
        source: 'ai',
        status: 'active',
      });
    } catch (e) {
      console.log(`  ❌ 生成失败: ${e.message.slice(0, 50)}`);
    }
  }

  // 批量插入
  if (questions.length > 0) {
    await prisma.question.createMany({ data: questions, skipDuplicates: true });
    console.log(`  ✅ ${subjectCode}/${section}: +${questions.length} 题`);
  }
  return questions;
}

function parseJson(text) {
  try {
    const m = String(text).match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

async function main() {
  console.log('🤖 批量生成本科题目...\n');

  const prompts = {
    'CET4/听力理解': `生成1道CET-4听力理解选择题。4个选项，考查对话细节。输出JSON: {"stem":"听力原文+问题","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"A","analysis":"解析"}`,
    'CET4/阅读理解': `生成1道CET-4阅读理解选择题。200词短文+1道细节题，4个选项。输出JSON同上。`,
    'CET6/仔细阅读': `生成1道CET-6仔细阅读选择题。300词学术文章+1道推断题，4个选项。输出JSON同上。`,
    'IELTS/阅读': `生成1道雅思阅读判断题。100词短文+1道True/False/Not Given题。输出JSON: {"stem":"短文+问题","options":["A. True","B. False","C. Not Given"],"answer":"A","analysis":"解析"}`,
    'IELTS/写作 Task 2': `生成1道雅思写作Task 2题目。讨论类议论文。输出JSON: {"stem":"题目要求","answer":"写作要点提示","analysis":"评分标准与结构建议"}`,
    'TOEFL/阅读': `生成1道托福阅读主旨题。150词学术段落+1道主旨题，4个选项。输出JSON同上。`,
    'TOEFL/听力讲座': `生成1道托福听力讲座细节题。100词讲座内容+1道题，4个选项。输出JSON同上。`,
    'LAW/宪法': `生成1道宪法学选择题。考查宪法基本原则，4个选项，引用具体法条。输出JSON同上。`,
    'LAW/民法': `生成1道民法选择题。考查《民法典》物权/合同/侵权，4个选项。输出JSON同上。`,
    'LAW/刑法': `生成1道刑法选择题。考查犯罪构成/刑罚，4个选项。输出JSON同上。`,
    'UNIV/大学语文': `生成1道大学语文文学常识选择题。古代文学/现代文学，4个选项。输出JSON同上。`,
    'UNIV/高等数学·极限': `生成1道高等数学极限计算选择题。4个选项。输出JSON同上。`,
  };

  let total = 0;
  for (const [key, prompt] of Object.entries(prompts)) {
    const [code, section] = key.split('/');
    const target = SUBJECTS[code]?.target || 20;
    const result = await generateBatch(code, section, target, prompt);
    total += result.length;
    await new Promise(r => setTimeout(r, 500)); // 避免API限流
  }

  console.log(`\n🎉 本次生成 ${total} 题`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
