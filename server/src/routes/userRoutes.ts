import { Router } from 'express';
import { userController } from '../controllers/userController';
import { verifyToken, requireAdmin, syncUser } from '../middleware/authMiddleware';

const router = Router();

// User creation is handled by POST /api/auth/register (authController)
// syncUser middleware auto-creates Postgres record on first authenticated request
router.get('/me', verifyToken(), syncUser, userController.getMe);
router.post('/me/top-up', verifyToken(), userController.topUp);
router.get('/:uid', verifyToken(), userController.getById);
router.put('/:uid', verifyToken(), userController.update);

// Admin-only routes
router.get('/', verifyToken(), requireAdmin, userController.getAll);
router.patch('/:uid/role', verifyToken(), requireAdmin, userController.setRole);

export default router;
