import { Router } from 'express';
import { authController } from '../container';
import { validateRegister } from '../middleware/validateRegister';

const router = Router();

// Public route — no auth token required
router.post('/register', validateRegister, authController.register);

export default router;
