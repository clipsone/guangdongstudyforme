import prisma from '../utils/prisma.js';

// 资料库列表
export const getResources = async (req, res) => {
  try {
    const { subjectId, type } = req.query;
    const resources = await prisma.resource.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
        ...(type ? { type } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: resources });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 新增资料
export const createResource = async (req, res) => {
  try {
    const { name, type, url, description, subjectId } = req.body;
    if (!name || !type || !url) {
      return res.status(400).json({ error: { message: '名称、类型、链接必填', status: 400 } });
    }
    const resource = await prisma.resource.create({
      data: { name, type, url, description, subjectId: subjectId || null }
    });
    res.json({ data: resource });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 删除资料
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.resource.delete({ where: { id } });
    res.json({ data: { id, deleted: true } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
