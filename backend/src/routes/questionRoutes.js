import express from 'express';
import * as questionController from '../controllers/questionController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', questionController.getQuestions);
router.get('/:id', questionController.getQuestionById);
router.post('/:id/feedback', questionController.submitQuestionFeedback);

export default router;