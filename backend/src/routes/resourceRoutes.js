import express from 'express';
import * as resourceController from '../controllers/resourceController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', resourceController.getResources);
router.post('/', resourceController.createResource);
router.delete('/:id', resourceController.deleteResource);

export default router;
