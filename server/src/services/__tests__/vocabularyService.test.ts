import Vocabulary from '../../models/Vocabulary';
import { VocabularyService } from '../vocabularyService';
import { AddVocabularyPayload, UpdateVocabularyPayload, MasteryLevel } from '../../types/vocabulary';

jest.mock('../../models/Vocabulary', () => ({
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
}));

describe('VocabularyService', () => {
    let service: VocabularyService;

    beforeEach(() => {
        service = new VocabularyService();
        jest.clearAllMocks();
    });

    describe('getVocabularies', () => {
        it('should return vocabularies for a user', async () => {
            const mockVocabs = [{ id: 1, word: 'test' }];
            (Vocabulary.findAll as jest.Mock).mockResolvedValue(mockVocabs);

            const result = await service.getVocabularies('user123');

            expect(Vocabulary.findAll).toHaveBeenCalledWith({
                where: { userId: 'user123' },
                order: [['createdAt', 'DESC']]
            });
            expect(result).toEqual(mockVocabs);
        });
    });

    describe('addVocabulary', () => {
        it('should create a new vocabulary', async () => {
            const payload = new AddVocabularyPayload('hello', 'greeting', 'chao', '/həˈləʊ/');
            const mockVocab = { id: 1, ...payload, userId: 'user123', masteryLevel: MasteryLevel.NEW };
            (Vocabulary.create as jest.Mock).mockResolvedValue(mockVocab);

            const result = await service.addVocabulary('user123', payload);

            expect(Vocabulary.create).toHaveBeenCalledWith({
                userId: 'user123',
                word: 'hello',
                englishMeaning: 'greeting',
                vietnameseMeaning: 'chao',
                ipaSpelling: '/həˈləʊ/',
                masteryLevel: MasteryLevel.NEW
            });
            expect(result).toEqual(mockVocab);
        });
    });

    describe('updateVocabulary', () => {
        it('should update an existing vocabulary', async () => {
            const payload = new UpdateVocabularyPayload('world', undefined, undefined, undefined, MasteryLevel.LEARNING);
            const mockVocabInstance = {
                id: '1',
                userId: 'user123',
                word: 'hello',
                update: jest.fn().mockResolvedValue(true)
            };
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(mockVocabInstance);

            const result = await service.updateVocabulary('user123', '1', payload);

            expect(Vocabulary.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 'user123' } });
            expect(mockVocabInstance.update).toHaveBeenCalledWith({
                word: 'world',
                englishMeaning: undefined,
                vietnameseMeaning: undefined,
                ipaSpelling: undefined,
                masteryLevel: MasteryLevel.LEARNING
            });
            expect(result).toEqual(mockVocabInstance);
        });

        it('should return null if vocabulary not found', async () => {
            const payload = new UpdateVocabularyPayload('world');
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(null);

            const result = await service.updateVocabulary('user123', '1', payload);

            expect(result).toBeNull();
        });
    });

    describe('deleteVocabulary', () => {
        it('should delete a vocabulary', async () => {
            const mockVocabInstance = {
                id: '1',
                userId: 'user123',
                destroy: jest.fn().mockResolvedValue(true)
            };
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(mockVocabInstance);

            const result = await service.deleteVocabulary('user123', '1');

            expect(Vocabulary.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 'user123' } });
            expect(mockVocabInstance.destroy).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false if vocabulary not found', async () => {
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(null);

            const result = await service.deleteVocabulary('user123', '1');

            expect(result).toBe(false);
        });
    });
});
