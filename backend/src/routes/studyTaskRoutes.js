import express from 'express';
import * as studyTaskController from '../controllers/studyTaskController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', studyTaskController.getStudyTasks);
router.post('/', studyTaskController.createStudyTask);
router.post('/:id/complete', studyTaskController.completeStudyTask);

export default router;