import prisma from '../utils/prisma.js';

const uid = (req) => req.userId;
const fail = (res, message, status = 400) => res.status(status).json({ error: { message, status } });
const dateOrNull = (value) => value ? new Date(value) : null;

export const getWorkspace = async (req, res) => {
  try {
    const userId = uid(req);
    const [courses, assignments, plans, files, schedules] = await Promise.all([
      prisma.universityCourse.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 100, select: { id: true, name: true, teacher: true, color: true, mastery: true, examDate: true } }),
      prisma.universityAssignment.findMany({ where: { userId }, orderBy: { dueDate: 'asc' }, take: 100, select: { id: true, title: true, course: true, courseId: true, dueDate: true, completed: true } }),
      prisma.universityPlan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, title: true, day: true, completed: true } }),
      prisma.universityFile.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, name: true, mimeType: true, size: true, storageUrl: true, category: true, courseId: true, aiSummary: true, parseStatus: true, createdAt: true } }),
      prisma.universitySchedule.findMany({ where: { userId }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], take: 200, select: { id: true, title: true, courseId: true, weekday: true, startTime: true, endTime: true, room: true, teacher: true } }),
    ]);
    res.json({ data: { courses, assignments, plans, files, schedules } });
  } catch (error) {
    console.error('[大学工作台]', error?.message || error);
    res.status(503).json({ error: { message: '大学工作台数据库结构尚未完成更新，请先执行 university_features 迁移', status: 503 } });
  }
};


export const getFiles = async (req, res) => {
  const userId = uid(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
  const [items, total] = await Promise.all([
    prisma.universityFile.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, mimeType: true, size: true, storageUrl: true, category: true, courseId: true, aiSummary: true, parseStatus: true, createdAt: true } }),
    prisma.universityFile.count({ where: { userId } }),
  ]);
  res.json({ data: items, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
};

export const createCourse = async (req, res) => {
  const { name, teacher, color, mastery, examDate } = req.body;
  if (!String(name || '').trim()) return fail(res, '课程名称不能为空');
  const course = await prisma.universityCourse.create({ data: { userId: uid(req), name: String(name).trim().slice(0, 100), teacher: String(teacher || '').slice(0, 100) || null, color: String(color || '#4f46e5'), mastery: Math.max(0, Math.min(100, Number(mastery) || 0)), examDate: dateOrNull(examDate) } });
  res.status(201).json({ data: course });
};
export const deleteCourse = async (req, res) => {
  const result = await prisma.universityCourse.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  res.json({ data: { deleted: result.count > 0 } });
};

export const updateCourse = async (req, res) => {
  const course = await prisma.universityCourse.findFirst({ where: { id: req.params.id, userId: uid(req) } });
  if (!course) return fail(res, '课程不存在', 404);
  const { name, teacher, color, mastery, examDate } = req.body;
  const updated = await prisma.universityCourse.update({ where: { id: course.id }, data: { ...(name !== undefined ? { name: String(name).trim().slice(0, 100) } : {}), ...(teacher !== undefined ? { teacher: String(teacher).slice(0, 100) } : {}), ...(color !== undefined ? { color: String(color) } : {}), ...(mastery !== undefined ? { mastery: Math.max(0, Math.min(100, Number(mastery) || 0)) } : {}), ...(examDate !== undefined ? { examDate: dateOrNull(examDate) } : {}) } });
  res.json({ data: updated });
};
export const createAssignment = async (req, res) => {
  const { title, course, courseId, dueDate } = req.body;
  if (!String(title || '').trim() || !dueDate) return fail(res, '作业名称和截止日期必填');
  const item = await prisma.universityAssignment.create({ data: { userId: uid(req), title: String(title).trim().slice(0, 200), course: String(course || '').slice(0, 100) || null, courseId: courseId || null, dueDate: new Date(dueDate) } });
  res.status(201).json({ data: item });
};
export const deleteAssignment = async (req, res) => {
  const result = await prisma.universityAssignment.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  res.json({ data: { deleted: result.count > 0 } });
};

export const updateAssignment = async (req, res) => {
  const item = await prisma.universityAssignment.findFirst({ where: { id: req.params.id, userId: uid(req) } });
  if (!item) return fail(res, '作业不存在', 404);
  const updated = await prisma.universityAssignment.update({ where: { id: item.id }, data: { ...(req.body.completed !== undefined ? { completed: Boolean(req.body.completed) } : {}), ...(req.body.title !== undefined ? { title: String(req.body.title).slice(0, 200) } : {}) } });
  res.json({ data: updated });
};
export const createPlan = async (req, res) => {
  if (!String(req.body.title || '').trim()) return fail(res, '计划内容不能为空');
  const plan = await prisma.universityPlan.create({ data: { userId: uid(req), title: String(req.body.title).trim().slice(0, 200), day: String(req.body.day || '今天').slice(0, 20) } });
  res.status(201).json({ data: plan });
};
export const updatePlan = async (req, res) => {
  const plan = await prisma.universityPlan.findFirst({ where: { id: req.params.id, userId: uid(req) } });
  if (!plan) return fail(res, '计划不存在', 404);
  const updated = await prisma.universityPlan.update({ where: { id: plan.id }, data: { ...(req.body.completed !== undefined ? { completed: Boolean(req.body.completed) } : {}) } });
  res.json({ data: updated });
};
export const deletePlan = async (req, res) => { const result = await prisma.universityPlan.deleteMany({ where: { id: req.params.id, userId: uid(req) } }); res.json({ data: { deleted: result.count > 0 } }); };
export const deleteFile = async (req, res) => { const result = await prisma.universityFile.deleteMany({ where: { id: req.params.id, userId: uid(req) } }); res.json({ data: { deleted: result.count > 0 } }); };
