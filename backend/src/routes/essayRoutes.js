import express from 'express';
import * as essayController from '../controllers/essayController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/', essayController.createEssay);
router.get('/', essayController.getEssays);
router.delete('/:id', essayController.deleteEssay);

export default router;
