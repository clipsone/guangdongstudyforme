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
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 新增资料
export const createResource = async (req, res) => {
  try {
    const { name, type, url, description, subjectId } = req.body;
    if (!name || !type || !url) {
      return res.status(400).json({ error: { message: '名称、类型、链接必填', status: 400 } });
    }
    if (typeof name !== 'string' || name.length > 100 || typeof url !== 'string' || url.length > 500) {
      return res.status(400).json({ error: { message: '名称或链接长度不合法', status: 400 } });
    }
    // 协议白名单：仅允许 http/https 链接，杜绝 javascript:/data: 等 XSS 载体
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: { message: '链接需以 http:// 或 https:// 开头', status: 400 } });
    }
    const resource = await prisma.resource.create({
      data: {
        name,
        type,
        url,
        description: typeof description === 'string' ? description.slice(0, 500) : null,
        subjectId: subjectId || null,
        uploadedBy: req.userId
      }
    });
    res.json({ data: resource });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 删除资料
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await prisma.resource.findUnique({ where: { id }, select: { uploadedBy: true } });
    if (!resource) return res.status(404).json({ error: { message: '资料不存在', status: 404 } });
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && resource.uploadedBy && resource.uploadedBy !== req.userId) {
      return res.status(403).json({ error: { message: '无权删除他人上传的资料', status: 403 } });
    }
    await prisma.resource.delete({ where: { id } });
    res.json({ data: { id, deleted: true } });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
