import { Router } from 'express';
import { attemptController } from '../container';
import { verifyToken } from '../middleware/authMiddleware';
import { upload } from '../config/multerConfig';

const router = Router();

// Apply upload middleware to handle 'audio' field
router.post('/', verifyToken(), upload.single('audio'), (req, res, next) => attemptController.create(req, res, next));
router.get('/user/:uid', verifyToken(), (req, res, next) => attemptController.getByUser(req, res, next));
router.get('/:id', verifyToken(), (req, res, next) => attemptController.getById(req, res, next));
router.delete('/:id', verifyToken(), (req, res, next) => attemptController.delete(req, res, next));

export default router;