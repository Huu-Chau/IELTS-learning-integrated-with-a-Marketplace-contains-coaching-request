import { Router } from 'express';
import { requestController } from '../controllers/requestController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', verifyToken(), requestController.create);
router.get('/', verifyToken(), requestController.getOpen);
router.get('/teacher/:id', verifyToken(), requestController.getForTeacher);
router.get('/student/:id', verifyToken(), requestController.getByStudent);
router.patch('/:id/status', verifyToken(), requestController.updateStatus);

export default router;
