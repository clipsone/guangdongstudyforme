import express from 'express';
import * as knowledgeController from '../controllers/knowledgeController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', knowledgeController.getKnowledge);
router.get('/:id', knowledgeController.getKnowledgeById);
router.patch('/:id/mastery', knowledgeController.updateMastery);

export default router;