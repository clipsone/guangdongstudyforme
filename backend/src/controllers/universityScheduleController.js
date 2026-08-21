import prisma from '../utils/prisma.js';
const uid = (req) => req.userId;
const fail = (res, message, status = 400) => res.status(status).json({ error: { message, status } });
export const createSchedule = async (req, res) => {
  const { title, courseId, weekday, startTime, endTime, room, teacher } = req.body;
  if (!String(title || '').trim() || !startTime || !endTime) return fail(res, '课程名称、开始和结束时间必填');
  const day = Number(weekday);
  if (!Number.isInteger(day) || day < 1 || day > 7) return fail(res, '星期必须是 1 到 7');
  const row = await prisma.universitySchedule.create({ data: { userId: uid(req), title: String(title).trim().slice(0, 100), courseId: courseId || null, weekday: day, startTime: String(startTime), endTime: String(endTime), room: String(room || '').slice(0, 100) || null, teacher: String(teacher || '').slice(0, 100) || null } });
  res.status(201).json({ data: row });
};
export const deleteSchedule = async (req, res) => { const result = await prisma.universitySchedule.deleteMany({ where: { id: req.params.id, userId: uid(req) } }); res.json({ data: { deleted: result.count > 0 } }); };
