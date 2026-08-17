import express from 'express';
import * as aiController from '../controllers/aiController.js';
import * as aiQuestionController from '../controllers/aiQuestionController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/explain', aiController.explainKnowledge);
router.post('/tutor', aiController.solveQuestion);
router.post('/essay-review', aiController.reviewEssay);
router.get('/chat/history', aiController.getChatHistory);
router.post('/chat', aiController.chat);
router.post('/generate-questions', aiQuestionController.generateQuestions);
router.post('/import-real-exam', aiQuestionController.importRealExam);

export default router;