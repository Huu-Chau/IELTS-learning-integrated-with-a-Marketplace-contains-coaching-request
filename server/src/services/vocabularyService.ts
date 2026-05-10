import Vocabulary from '../models/Vocabulary';
import { AddVocabularyPayload, UpdateVocabularyPayload, MasteryLevel } from '../types/vocabulary';

export interface IVocabularyService {
    getVocabularies(userId: string): Promise<Vocabulary[]>;
    addVocabulary(userId: string, payload: AddVocabularyPayload): Promise<Vocabulary>;
    updateVocabulary(userId: string, id: string, payload: UpdateVocabularyPayload): Promise<Vocabulary | null>;
    deleteVocabulary(userId: string, id: string): Promise<boolean>;
}

export class VocabularyService implements IVocabularyService {
    async getVocabularies(userId: string): Promise<Vocabulary[]> {
        return await Vocabulary.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
    }

    async addVocabulary(userId: string, payload: AddVocabularyPayload): Promise<Vocabulary> {
        return await Vocabulary.create({
            userId,
            word: payload.word,
            englishMeaning: payload.englishMeaning,
            vietnameseMeaning: payload.vietnameseMeaning,
            ipaSpelling: payload.ipaSpelling,
            masteryLevel: MasteryLevel.NEW
        });
    }

    async updateVocabulary(userId: string, id: string, payload: UpdateVocabularyPayload): Promise<Vocabulary | null> {
        const vocab = await Vocabulary.findOne({ where: { id, userId } });

        if (!vocab) {
            return null;
        }

        await vocab.update({
            word: payload.word !== undefined ? payload.word : vocab.word,
            englishMeaning: payload.englishMeaning !== undefined ? payload.englishMeaning : vocab.englishMeaning,
            vietnameseMeaning: payload.vietnameseMeaning !== undefined ? payload.vietnameseMeaning : vocab.vietnameseMeaning,
            ipaSpelling: payload.ipaSpelling !== undefined ? payload.ipaSpelling : vocab.ipaSpelling,
            masteryLevel: payload.masteryLevel !== undefined ? payload.masteryLevel : vocab.masteryLevel,
        });

        return vocab;
    }

    async deleteVocabulary(userId: string, id: string): Promise<boolean> {
        const vocab = await Vocabulary.findOne({ where: { id, userId } });

        if (!vocab) {
            return false;
        }

        await vocab.destroy();
        return true;
    }
}
