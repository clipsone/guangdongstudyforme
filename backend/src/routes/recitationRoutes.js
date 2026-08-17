import express from 'express';
import * as recitationController from '../controllers/recitationController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/items', recitationController.getRecitationItems);
router.post('/records', recitationController.createRecitationRecord);
router.get('/records', recitationController.getMyRecitationRecords);
router.get('/today', recitationController.getTodayRecitation);

export default router;