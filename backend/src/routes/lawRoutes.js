import express from 'express';
import * as lawController from '../controllers/lawController.js';
const router = express.Router();
router.get('/status', lawController.getLawStatus);
export default router;
