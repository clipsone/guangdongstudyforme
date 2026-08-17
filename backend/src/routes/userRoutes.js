import express from 'express';
import * as userController from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

export default router;
