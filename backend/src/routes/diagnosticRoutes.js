import express from 'express';
import * as diagnosticController from '../controllers/diagnosticController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/generate', diagnosticController.generateDiagnostic);
router.get('/', diagnosticController.getDiagnostics);

export default router;
