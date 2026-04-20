import { Router } from 'express';
import { vocabularyController } from '../controllers/vocabularyController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// All vocabulary routes require authentication
router.use(verifyToken());

router.get('/', vocabularyController.getVocabularies);
router.post('/', vocabularyController.addVocabulary);
router.put('/:id', vocabularyController.updateVocabulary);
router.delete('/:id', vocabularyController.deleteVocabulary);

export default router;
