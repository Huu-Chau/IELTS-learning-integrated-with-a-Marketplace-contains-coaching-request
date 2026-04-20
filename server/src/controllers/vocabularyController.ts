import { Request, Response } from 'express';
import Vocabulary from '../models/Vocabulary';

export const vocabularyController = {
    /**
     * GET /api/vocabulary
     * Get all vocabulary words for the authenticated user
     */
    async getVocabularies(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.uid;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const vocabularies = await Vocabulary.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']]
            });

            res.json({ vocabularies });
        } catch (error) {
            console.error('[vocabularyController] getVocabularies error:', error);
            res.status(500).json({ error: 'Failed to fetch vocabulary' });
        }
    },

    /**
     * POST /api/vocabulary
     * Add a new vocabulary word
     */
    async addVocabulary(req: Request, res: Response): Promise<void> {
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

            const newVocab = await Vocabulary.create({
                userId,
                word,
                englishMeaning,
                vietnameseMeaning,
                ipaSpelling,
                masteryLevel: 'New'
            });

            res.status(201).json({ vocabulary: newVocab });
        } catch (error) {
            console.error('[vocabularyController] addVocabulary error:', error);
            res.status(500).json({ error: 'Failed to add vocabulary' });
        }
    },

    /**
     * PUT /api/vocabulary/:id
     * Update an existing vocabulary word
     */
    async updateVocabulary(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.uid;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const vocab = await Vocabulary.findOne({ where: { id, userId } });

            if (!vocab) {
                res.status(404).json({ error: 'Vocabulary not found' });
                return;
            }

            const { word, englishMeaning, vietnameseMeaning, ipaSpelling, masteryLevel } = req.body;

            await vocab.update({
                word: word !== undefined ? word : vocab.word,
                englishMeaning: englishMeaning !== undefined ? englishMeaning : vocab.englishMeaning,
                vietnameseMeaning: vietnameseMeaning !== undefined ? vietnameseMeaning : vocab.vietnameseMeaning,
                ipaSpelling: ipaSpelling !== undefined ? ipaSpelling : vocab.ipaSpelling,
                masteryLevel: masteryLevel !== undefined ? masteryLevel : vocab.masteryLevel,
            });

            res.json({ vocabulary: vocab });
        } catch (error) {
            console.error('[vocabularyController] updateVocabulary error:', error);
            res.status(500).json({ error: 'Failed to update vocabulary' });
        }
    },

    /**
     * DELETE /api/vocabulary/:id
     * Delete a vocabulary word
     */
    async deleteVocabulary(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.uid;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const vocab = await Vocabulary.findOne({ where: { id, userId } });

            if (!vocab) {
                res.status(404).json({ error: 'Vocabulary not found' });
                return;
            }

            await vocab.destroy();

            res.json({ success: true, message: 'Vocabulary deleted successfully' });
        } catch (error) {
            console.error('[vocabularyController] deleteVocabulary error:', error);
            res.status(500).json({ error: 'Failed to delete vocabulary' });
        }
    }
};
