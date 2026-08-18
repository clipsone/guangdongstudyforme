import prisma from '../utils/prisma.js';
import { getUserMasteryMap, subjectMasteryFor } from '../services/mastery.service.js';

// 获取统计数据 - 仪表盘
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.userId;
    const uid = req.userId;
    if (!uid) {
      return res.status(404).json({ error: { message: '默认用户不存在', status: 404 } });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalExercises, recentExercises, wrongQuestions, studySessions, exams, todaySessions] = await Promise.all([
      prisma.exerciseRecord.count({
        where: { userId: uid }
      }),
      prisma.exerciseRecord.findMany({
        where: { userId: uid },
        take: 7,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          accuracy: true,
          totalQuestions: true,
          subject: {
            select: { name: true }
          }
        }
      }),
      prisma.wrongQuestion.count({
        where: { userId: uid, mastered: false }
      }),
      prisma.studySession.findMany({
        where: { userId: uid },
        take: 7,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          duration: true,
          subjectId: true,
          startedAt: true
        }
      }),
      prisma.exam.findMany({
        where: { userId: uid, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          score: true,
          createdAt: true,
          template: { include: { subject: true } }
        }
      }),
      prisma.studySession.findMany({
        where: { userId: uid, startedAt: { gte: todayStart } },
        select: { duration: true }
      })
    ]);

    const todayStudySeconds = todaySessions.reduce((s, x) => s + x.duration, 0);
    const avgExamScore = exams.length > 0
      ? Math.round(exams.reduce((s, x) => s + (x.score || 0), 0) / exams.length)
      : 0;

    // 计算总体掌握度（按用户隔离：新用户全 0）
    const subjects = await prisma.subject.findMany();
    const userMastery = await getUserMasteryMap(uid);
    const subjectStats = await Promise.all(
      subjects.map(async (subject) => {
        const knowledgePoints = await prisma.knowledgePoint.findMany({
          where: { chapter: { subjectId: subject.id } },
          select: { id: true }
        });

        const avgMastery = knowledgePoints.length > 0
          ? knowledgePoints.reduce((sum, kp) => sum + (userMastery.get(kp.id) || 0), 0) / knowledgePoints.length
          : 0;

        return {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          mastery: Math.round(avgMastery)
        };
      })
    );

    res.json({
      data: {
        totalExercises,
        recentExercises,
        wrongQuestionCount: wrongQuestions,
        recentSessions: studySessions,
        subjectStats,
        totalExams: exams.length,
        avgExamScore,
        todayStudySeconds
      }
    });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取进步曲线数据
export const getProgressData = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.userId;
    const uid = req.userId;
    if (!uid) {
      return res.status(404).json({ error: { message: '默认用户不存在', status: 404 } });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [exercises, exams] = await Promise.all([
      prisma.exerciseRecord.findMany({
        where: {
          userId: uid,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          accuracy: true,
          subject: {
            select: { name: true }
          }
        }
      }),
      prisma.exam.findMany({
        where: {
          userId: uid,
          status: 'completed',
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          score: true,
          template: { select: { totalScore: true } }
        }
      })
    ]);

    // 按日期分组（练习 + 模考合并，模考正确率 = 得分/总分）
    const groupedData = {};
    exercises.forEach(ex => {
      const date = ex.createdAt.toISOString().split('T')[0];
      if (!groupedData[date]) {
        groupedData[date] = { dates: [], accuracy: [] };
      }
      groupedData[date].dates.push(date);
      groupedData[date].accuracy.push(ex.accuracy);
    });
    exams.forEach(ex => {
      const date = ex.createdAt.toISOString().split('T')[0];
      if (!groupedData[date]) {
        groupedData[date] = { dates: [], accuracy: [] };
      }
      groupedData[date].dates.push(date);
      const total = ex.template?.totalScore || 100;
      groupedData[date].accuracy.push(((ex.score || 0) / total) * 100);
    });

    const chartData = Object.values(groupedData).map(group => ({
      date: group.dates[0],
      accuracy: group.accuracy.reduce((sum, acc) => sum + acc, 0) / group.accuracy.length
    }));

    res.json({ data: chartData });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取掌握度历史（快照 + 当前值兜底）
export const getMasteryHistory = async (req, res) => {
  try {
    const { days = 60 } = req.query;
    const userId = req.userId;
    const uid = req.userId;
    if (!uid) return res.json({ data: [] });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const snapshots = await prisma.masterySnapshot.findMany({
      where: { userId: uid, recordedAt: { gte: startDate } },
      orderBy: { recordedAt: 'asc' }
    });

    const subjects = await prisma.subject.findMany();
    const userMastery = await getUserMasteryMap(uid);
    const points = await prisma.knowledgePoint.findMany({
      where: { level: 2 },
      select: { id: true }
    });

    const currentAvgFromUser = () => {
      if (points.length === 0) return 0;
      return Math.round(points.reduce((s, p) => s + (userMastery.get(p.id) || 0), 0) / points.length);
    };

    if (snapshots.length === 0) {
      // 无历史快照时返回当前值作为起点（按用户）
      return res.json({ data: [{ date: new Date().toISOString().split('T')[0], mastery: currentAvgFromUser() }] });
    }

    // 按天聚合三科平均
    const byDay = {};
    for (const s of snapshots) {
      const date = s.recordedAt.toISOString().split('T')[0];
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(s.mastery);
    }
    const currentAvg = currentAvgFromUser();

    const data = Object.keys(byDay).sort().map((date) => ({
      date,
      mastery: Math.round(byDay[date].reduce((s, x) => s + x, 0) / byDay[date].length)
    }));
    if (data.length > 0) data[data.length - 1].mastery = currentAvg;
    res.json({ data });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取雷达图数据
export const getRadarData = async (req, res) => {
  try {
    const userId = req.userId;
    const uid = req.userId;
    if (!uid) {
      return res.status(404).json({ error: { message: '默认用户不存在', status: 404 } });
    }

    const subjects = await prisma.subject.findMany();
    const radarMap = await getUserMasteryMap(uid);
    const radarData = await Promise.all(
      subjects.map(async (subject) => {
        // 掌握度（按用户）
        const knowledgePoints = await prisma.knowledgePoint.findMany({
          where: { chapter: { subjectId: subject.id } },
          select: { id: true }
        });
        const mastery = knowledgePoints.length > 0
          ? knowledgePoints.reduce((sum, kp) => sum + (radarMap.get(kp.id) || 0), 0) / knowledgePoints.length
          : 0;

        // 练习准确率（含模考）
        const [exercises, exams] = await Promise.all([
          prisma.exerciseRecord.findMany({
            where: { userId: uid, subjectId: subject.id },
            select: { accuracy: true }
          }),
          prisma.exam.findMany({
            where: {
              userId: uid,
              status: 'completed',
              template: { subjectId: subject.id }
            },
            select: { score: true, template: { select: { totalScore: true } } }
          })
        ]);
        const exerciseAcc = exercises.length > 0
          ? exercises.reduce((sum, ex) => sum + ex.accuracy, 0) / exercises.length
          : 0;
        const examAcc = exams.length > 0
          ? exams.reduce((sum, ex) => sum + (ex.score || 0) / (ex.template?.totalScore || 100) * 100, 0) / exams.length
          : 0;
        const accuracy = (exercises.length + exams.length) > 0
          ? (exerciseAcc * exercises.length + examAcc * exams.length) / (exercises.length + exams.length)
          : 0;

        // 学习时长
        const sessions = await prisma.studySession.findMany({
          where: { userId: uid, subjectId: subject.id }
        });
        const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / 3600; // 转为小时

        // 稳定性：正确率标准差越小越稳定（100 - 波动幅度）
        const allAccs = [
          ...exercises.map((ex) => ex.accuracy),
          ...exams.map((ex) => (ex.score || 0) / (ex.template?.totalScore || 100) * 100)
        ];
        let stability = 50;
        if (allAccs.length >= 3) {
          const mean = allAccs.reduce((s2, x) => s2 + x, 0) / allAccs.length;
          const variance = allAccs.reduce((s2, x) => s2 + (x - mean) * (x - mean), 0) / allAccs.length;
          stability = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance) * 1.6)));
        }

        // 冲刺进度：备考周期按 365 天算，离考试越近进度越高
        const examDate = new Date(process.env.EXAM_DATE || '2027-01-10T00:00:00.000Z');
        const totalSpan = 365;
        const elapsed = Math.max(0, Math.min(totalSpan, (examDate - Date.now()) / 86400000));
        const pace = Math.round(((totalSpan - elapsed) / totalSpan) * 100);

        return {
          subject: subject.name,
          mastery: Math.round(mastery),
          accuracy: Math.round(accuracy),
          duration: Math.round(totalDuration * 10) / 10,
          stability,
          pace
        };
      })
    );

    res.json({ data: radarData });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};