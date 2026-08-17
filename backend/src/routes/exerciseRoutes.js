import express from 'express';
import * as exerciseController from '../controllers/exerciseController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', exerciseController.createExercise);
router.post('/generate', exerciseController.generateExercisePaper);
router.get('/', exerciseController.getExercises);
router.get('/:id', exerciseController.getExerciseById);

export default router;