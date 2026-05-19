import { Router } from 'express';
import { vocabularyController } from '../container';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// All vocabulary routes require authentication
router.use(verifyToken());

router.get('/', (req, res, next) => vocabularyController.getVocabularies(req, res, next));
router.post('/', (req, res, next) => vocabularyController.addVocabulary(req, res, next));
router.put('/:id', (req, res, next) => vocabularyController.updateVocabulary(req, res, next));
router.delete('/:id', (req, res, next) => vocabularyController.deleteVocabulary(req, res, next));

export default router;
