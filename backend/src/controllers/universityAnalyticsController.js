import prisma from '../utils/prisma.js';
const uid = (req) => req.userId;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const getAnalytics = async (req, res) => {
  const userId = uid(req);
  const [courses, assignments, plans, grades, sessions, notifications] = await Promise.all([
    prisma.universityCourse.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.universityAssignment.findMany({ where: { userId }, orderBy: { dueDate: 'asc' } }),
    prisma.universityPlan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.universityGrade.findMany({ where: { userId }, include: { course: true } }),
    prisma.studySession.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 500 }),
    prisma.universityNotification.findMany({ where: { userId, read: false }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const now = Date.now();
  const upcoming = assignments.filter((x) => !x.completed && new Date(x.dueDate).getTime() >= now);
  const courseStats = courses.map((course) => {
    const grade = grades.find((g) => g.courseId === course.id);
    const seconds = sessions.filter((s) => s.subjectId === course.id).reduce((sum, s) => sum + s.duration, 0);
    const scoreParts = [grade?.usual, grade?.midterm, grade?.final].filter((x) => typeof x === 'number');
    const predicted = scoreParts.length ? Math.round(scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length) : null;
    const risk = course.mastery < 40 || (course.examDate && new Date(course.examDate).getTime() - now < 21 * 86400000 && course.mastery < 70);
    return { course, grade, studySeconds: seconds, predictedScore: predicted, risk: Boolean(risk) };
  });
  const completedAssignments = assignments.filter((x) => x.completed).length;
  const completedPlans = plans.filter((x) => x.completed).length;
  const gpaCredits = grades.reduce((sum, g) => sum + (g.credits || 0), 0);
  const gpa = gpaCredits ? grades.reduce((sum, g) => sum + (((g.final ?? g.midterm ?? g.usual ?? 0) / 100) * 4 * g.credits), 0) / gpaCredits : null;
  res.json({ data: { courseStats, gpa: gpa === null ? null : Number(gpa.toFixed(2)), assignmentRate: assignments.length ? Math.round(completedAssignments / assignments.length * 100) : 0, planRate: plans.length ? Math.round(completedPlans / plans.length * 100) : 0, totalStudySeconds: sessions.reduce((sum, s) => sum + s.duration, 0), upcomingAssignments: upcoming.slice(0, 8), notifications } });
};
export const saveGrade = async (req, res) => {
  const { courseId, usual, midterm, final, credits, semester } = req.body;
  const course = await prisma.universityCourse.findFirst({ where: { id: courseId, userId: uid(req) } });
  if (!course) return res.status(404).json({ error: { message: '课程不存在', status: 404 } });
  const values = { usual, midterm, final };
  for (const key of Object.keys(values)) if (values[key] !== null && values[key] !== undefined && (Number(values[key]) < 0 || Number(values[key]) > 100)) return res.status(400).json({ error: { message: '成绩必须在 0 到 100 之间', status: 400 } });
  const grade = await prisma.universityGrade.upsert({ where: { userId_courseId_semester: { userId: uid(req), courseId, semester: String(semester || '本学期') } }, update: { usual: usual == null ? null : Number(usual), midterm: midterm == null ? null : Number(midterm), final: final == null ? null : Number(final), credits: Number(credits) || 0 }, create: { userId: uid(req), courseId, usual: usual == null ? null : Number(usual), midterm: midterm == null ? null : Number(midterm), final: final == null ? null : Number(final), credits: Number(credits) || 0, semester: String(semester || '本学期') } });
  res.json({ data: grade });
};
export const getNotifications = async (req, res) => { const rows = await prisma.universityNotification.findMany({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, take: 50 }); res.json({ data: rows }); };
export const markNotificationsRead = async (req, res) => { await prisma.universityNotification.updateMany({ where: { userId: uid(req), read: false }, data: { read: true } }); res.json({ data: { ok: true } }); };
export const refreshNotifications = async (req, res) => {
  const userId = uid(req); const now = new Date(); const inThreeDays = new Date(now.getTime() + 3 * 86400000);
  const assignments = await prisma.universityAssignment.findMany({ where: { userId, completed: false, dueDate: { lte: inThreeDays, gte: new Date(now.getTime() - 86400000) } } });
  for (const item of assignments) { const kind = new Date(item.dueDate).toDateString() === now.toDateString() ? 'due-today' : 'due-soon'; const exists = await prisma.universityNotification.findFirst({ where: { userId, type: kind, title: item.title, dueAt: item.dueDate } }); if (!exists) await prisma.universityNotification.create({ data: { userId, type: kind, title: item.title, message: kind === 'due-today' ? '作业今天截止' : '作业将在 3 天内截止', dueAt: item.dueDate } }); }
  res.json({ data: { created: assignments.length } });
};
