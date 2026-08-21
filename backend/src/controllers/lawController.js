import prisma from '../utils/prisma.js';
import { syncLawCurriculum } from '../services/lawCurriculum.service.js';

export const getLawStatus = async (_req, res) => {
  try {
    const subject = await prisma.subject.findUnique({ where: { code: 'LAW' }, select: { id: true, name: true, code: true } });
    if (!subject) return res.json({ data: { subject: null, chapters: 0, knowledgePoints: 0, questions: 0, generatedQuestions: 0, examTemplates: 0 } });
    let [chapters, knowledgePoints, questions, generatedQuestions, examTemplates] = await Promise.all([
      prisma.chapter.count({ where: { subjectId: subject.id } }),
      prisma.knowledgePoint.count({ where: { chapter: { subjectId: subject.id } } }),
      prisma.question.count({ where: { subjectId: subject.id, status: 'active' } }),
      prisma.question.count({ where: { subjectId: subject.id, status: 'active', source: { in: ['course-generated', 'generated-practice', 'ai-generated'] } } }),
      prisma.examTemplate.count({ where: { subjectId: subject.id } }),
    ]);
    if (chapters === 0 || knowledgePoints === 0 || examTemplates < 3) {
      await syncLawCurriculum();
      [chapters, knowledgePoints, questions, generatedQuestions, examTemplates] = await Promise.all([
        prisma.chapter.count({ where: { subjectId: subject.id } }),
        prisma.knowledgePoint.count({ where: { chapter: { subjectId: subject.id } } }),
        prisma.question.count({ where: { subjectId: subject.id, status: 'active' } }),
        prisma.question.count({ where: { subjectId: subject.id, status: 'active', source: { in: ['course-generated', 'generated-practice', 'ai-generated'] } } }),
        prisma.examTemplate.count({ where: { subjectId: subject.id } }),
      ]);
    }
    res.json({ data: { subject, chapters, knowledgePoints, questions, generatedQuestions, examTemplates } });
  } catch (error) {
    console.error('[法学状态]', error?.message || error);
    res.status(500).json({ error: { message: '法学状态读取失败', status: 500 } });
  }
};
