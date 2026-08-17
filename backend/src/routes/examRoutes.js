import express from 'express';
import * as examController from '../controllers/examController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/templates', examController.getExamTemplates);
router.post('/', examController.createExam);
router.get('/', examController.getExams);
router.get('/:id', examController.getExamById);
router.post('/:id/submit', examController.submitExam);

export default router;
