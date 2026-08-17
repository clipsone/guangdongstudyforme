import express from 'express';
import * as weeklyReportController from '../controllers/weeklyReportController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/generate', weeklyReportController.generateWeeklyReport);
router.get('/', weeklyReportController.getWeeklyReports);

export default router;
