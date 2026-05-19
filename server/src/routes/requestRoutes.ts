import { Router } from 'express';
import { requestController } from '../container';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// NOTE: POST / removed — requestController.create was deleted.
// Use POST /api/marketplace/requests for creating marketplace requests.
router.get('/', verifyToken(), (req, res, next) => requestController.getOpen(req, res, next));
router.get('/teacher/:id', verifyToken(), (req, res, next) => requestController.getForTeacher(req, res, next));
router.get('/student/:id', verifyToken(), (req, res, next) => requestController.getByStudent(req, res, next));
router.patch('/:id/status', verifyToken(), (req, res, next) => requestController.updateStatus(req, res, next));

export default router;
