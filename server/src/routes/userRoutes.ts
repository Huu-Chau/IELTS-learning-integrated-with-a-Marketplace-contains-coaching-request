import { Router } from 'express';
import { userController } from '../container';
import { verifyToken, requireAdmin, syncUser } from '../middleware/authMiddleware';
import { validateTopUp, validateSetRole, validateUpdateUser } from '../middleware/userValidator';

const router = Router();

// User creation is handled by POST /api/auth/register (authController)
// syncUser middleware auto-creates Postgres record on first authenticated request
router.get('/me', verifyToken(), syncUser, userController.getMe);
router.post('/me/top-up', verifyToken(), validateTopUp, userController.topUp);
router.get('/:uid', verifyToken(), userController.getById);
router.put('/:uid', verifyToken(), validateUpdateUser, userController.update);

// Admin-only routes
router.get('/', verifyToken(), requireAdmin, userController.getAll);
router.patch('/:uid/role', verifyToken(), requireAdmin, validateSetRole, userController.setRole);

export default router;
