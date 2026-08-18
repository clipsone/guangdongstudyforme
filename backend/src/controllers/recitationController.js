import prisma from '../utils/prisma.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';

// 获取背诵项目
export const getRecitationItems = async (req, res) => {
  try {
    const { subjectId, category, limit = 50 } = req.query;

    const where = {};
    if (subjectId) where.subjectId = subjectId;
    if (category) where.category = category;

    const items = await prisma.recitationItem.findMany({
      where,
      include: {
        subject: true
      },
      orderBy: { order: 'asc' },
      take: parseInt(limit)
    });

    res.json({ data: items });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 提交背诵记录（mastered=false 表示「不熟」，按艾宾浩斯回退到第 1 天）
export const createRecitationRecord = async (req, res) => {
  try {
    const { itemId, reviewed, mastered } = req.body;
    const userId = req.userId;
    const passed = mastered !== false && reviewed !== false;

    // 艾宾浩斯复习间隔（天）
    const intervals = [1, 2, 4, 7, 15];

    const existingRecord = await prisma.recitationRecord.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId
        }
      }
    });

    let record;
    if (existingRecord) {
      if (passed) {
        const nextStage = Math.min(existingRecord.stage + 1, intervals.length);
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + intervals[nextStage - 1]);

        record = await prisma.recitationRecord.update({
          where: { id: existingRecord.id },
          data: {
            stage: nextStage,
            reviewed: true,
            nextReviewAt: nextReviewDate
          }
        });
      } else {
        // 不熟：回退到第 1 天，明天再背
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + 1);
        record = await prisma.recitationRecord.update({
          where: { id: existingRecord.id },
          data: {
            stage: 1,
            reviewed: true,
            nextReviewAt: nextReviewDate
          }
        });
      }
    } else {
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + intervals[0]);

      record = await prisma.recitationRecord.create({
        data: {
          userId,
          itemId,
          stage: 1,
          reviewed: true,
          nextReviewAt: nextReviewDate
        }
      });
    }

    res.json({ data: record });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取我的全部背诵记录（用于展示复习进度）
export const getMyRecitationRecords = async (req, res) => {
  try {
    const userId = req.userId;

    const records = await prisma.recitationRecord.findMany({
      where: { userId },
      include: {
        item: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ data: records });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取今日待复习背诵项目
export const getTodayRecitation = async (req, res) => {
  try {
    const userId = req.userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await prisma.recitationRecord.findMany({
      where: {
        userId,
        nextReviewAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        item: {
          include: {
            subject: true
          }
        }
      }
    });

    res.json({ data: records });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};