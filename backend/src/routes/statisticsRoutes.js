import express from 'express';
import * as statisticsController from '../controllers/statisticsController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', statisticsController.getDashboardStats);
router.get('/progress', statisticsController.getProgressData);
router.get('/mastery-history', statisticsController.getMasteryHistory);
router.get('/radar', statisticsController.getRadarData);

export default router;