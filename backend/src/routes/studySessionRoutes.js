import express from 'express';
import * as studySessionController from '../controllers/studySessionController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', studySessionController.createStudySession);
router.get('/', studySessionController.getStudySessions);

export default router;
