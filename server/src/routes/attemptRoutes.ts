import { Router } from 'express';
import { attemptController } from '../container';
import { verifyToken } from '../middleware/authMiddleware';
import { upload } from '../config/multerConfig';

const router = Router();

// Apply upload middleware to handle 'audio' field
router.post('/', verifyToken(), upload.single('audio'), attemptController.create);
router.get('/user/:uid', verifyToken(), attemptController.getByUser);
router.get('/:id', verifyToken(), attemptController.getById);

export default router;
