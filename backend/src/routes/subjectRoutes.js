import express from 'express';
import * as subjectController from '../controllers/subjectController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', subjectController.getSubjects);

export default router;
