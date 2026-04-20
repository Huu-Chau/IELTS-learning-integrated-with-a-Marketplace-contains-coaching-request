import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Public route — no auth token required
router.post('/register', authController.register);

export default router;
