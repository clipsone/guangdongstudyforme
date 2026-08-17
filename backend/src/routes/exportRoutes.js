import express from 'express';
import * as exportController from '../controllers/exportController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', exportController.exportData);

export default router;
