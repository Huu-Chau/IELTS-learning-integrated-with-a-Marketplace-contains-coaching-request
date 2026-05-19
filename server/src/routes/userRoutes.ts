import { Router } from 'express';
import { userController } from '../container';
import { verifyToken, requireAdmin, syncUser } from '../middleware/authMiddleware';
import { validateTopUp, validateSetRole, validateUpdateUser } from '../middleware/userValidator';

const router = Router();

// User creation is handled by POST /api/auth/register (authController)
// syncUser middleware auto-creates Postgres record on first authenticated request
router.get('/me', verifyToken(), syncUser, (req, res, next) => userController.getMe(req, res, next));
router.post('/me/top-up', verifyToken(), validateTopUp, (req, res, next) => userController.topUp(req, res, next));
router.get('/:uid', verifyToken(), (req, res, next) => userController.getById(req, res, next));
router.put('/:uid', verifyToken(), validateUpdateUser, (req, res, next) => userController.update(req, res, next));

// Admin-only routes
router.get('/', verifyToken(), requireAdmin, (req, res, next) => userController.getAll(req, res, next));
router.patch('/:uid/role', verifyToken(), requireAdmin, validateSetRole, (req, res, next) => userController.setRole(req, res, next));

export default router;
