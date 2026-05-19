import { Request, Response, NextFunction } from 'express';
import { IVocabularyService } from '../services/vocabularyService';
import { AddVocabularyPayload, UpdateVocabularyPayload } from '../types/vocabulary';

export interface IVocabularyController {
    getVocabularies(req: Request, res: Response, next: NextFunction): Promise<void>;
    addVocabulary(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateVocabulary(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteVocabulary(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class VocabularyController implements IVocabularyController {
    constructor(private readonly vocabularyService: IVocabularyService) { }

    getVocabularies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.uid;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const vocabularies = await this.vocabularyService.getVocabularies(userId);
            res.json({ vocabularies });
            return next();
        } catch (error) {
            console.error('[VocabularyController] getVocabularies error:', error);
            res.status(500).json({ error: 'Failed to fetch vocabulary' });
            return next(error);
        }
    };

    addVocabulary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.uid;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { word, englishMeaning, vietnameseMeaning, ipaSpelling } = req.body;
            if (!word) {
                res.status(400).json({ error: 'Word is required' });
                return;
            }

            const payload = new AddVocabularyPayload(word, englishMeaning, vietnameseMeaning, ipaSpelling);
            const newVocab = await this.vocabularyService.addVocabulary(userId, payload);

            res.status(201).json({ vocabulary: newVocab });
            return next();
        } catch (error) {
            console.error('[VocabularyController] addVocabulary error:', error);
            res.status(500).json({ error: 'Failed to add vocabulary' });
            return next(error);
        }
    };

    updateVocabulary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.uid;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { word, englishMeaning, vietnameseMeaning, ipaSpelling, masteryLevel } = req.body;
            const payload = new UpdateVocabularyPayload(word, englishMeaning, vietnameseMeaning, ipaSpelling, masteryLevel);

            const vocab = await this.vocabularyService.updateVocabulary(userId, id, payload);

            if (!vocab) {
                res.status(404).json({ error: 'Vocabulary not found' });
                return;
            }

            res.json({ vocabulary: vocab });
            return next();
        } catch (error) {
            console.error('[VocabularyController] updateVocabulary error:', error);
            res.status(500).json({ error: 'Failed to update vocabulary' });
            return next(error);
        }
    };

    deleteVocabulary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.uid;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const deleted = await this.vocabularyService.deleteVocabulary(userId, id);

            if (!deleted) {
                res.status(404).json({ error: 'Vocabulary not found' });
                return;
            }

            res.json({ success: true, message: 'Vocabulary deleted successfully' });
            return next();
        } catch (error) {
            console.error('[VocabularyController] deleteVocabulary error:', error);
            res.status(500).json({ error: 'Failed to delete vocabulary' });
            return next(error);
        }
    };
}
