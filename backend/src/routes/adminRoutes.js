import express from 'express';
import * as adminController from '../controllers/adminController.js';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// 数据总览
router.get('/stats', adminController.getStats);
// 题库管理
router.get('/coverage', adminController.getCoverage);
router.get('/questions', adminController.getQuestions);
router.patch('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.archiveQuestion);
// 纠错反馈
router.get('/feedbacks', adminController.getFeedbacks);
router.patch('/feedbacks/:id', adminController.resolveFeedback);
// 用户管理
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', adminController.setUserRole);
router.delete('/users/:id', adminController.deleteUser);

export default router;
