import express from 'express';
import * as wrongQuestionController from '../controllers/wrongQuestionController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', wrongQuestionController.getWrongQuestions);
router.get('/review-due', wrongQuestionController.getReviewDue);
router.post('/:id/review', wrongQuestionController.reviewWrongQuestion);
router.post('/batch-review', wrongQuestionController.batchReviewWrongQuestions);

export default router;