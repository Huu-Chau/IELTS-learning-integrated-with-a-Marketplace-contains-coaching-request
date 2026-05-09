import { Request, Response } from 'express';
import { vocabularyController } from '../vocabularyController';
import Vocabulary from '../../models/Vocabulary';

jest.mock('../../models/Vocabulary', () => ({
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
}));

describe('vocabularyController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            user: { uid: 'test-user-id', email: 'test@example.com' },
            params: {},
            body: {}
        } as Partial<Request>;
        mockRes = {
            status: statusMock,
            json: jsonMock
        };
        jest.clearAllMocks();
    });

    describe('getVocabularies', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await vocabularyController.getVocabularies(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return vocabularies on success', async () => {
            const mockVocabs = [{ id: 1, word: 'test' }];
            (Vocabulary.findAll as jest.Mock).mockResolvedValue(mockVocabs);

            await vocabularyController.getVocabularies(mockReq as Request, mockRes as Response);

            expect(Vocabulary.findAll).toHaveBeenCalledWith({
                where: { userId: 'test-user-id' },
                order: [['createdAt', 'DESC']]
            });
            expect(jsonMock).toHaveBeenCalledWith({ vocabularies: mockVocabs });
        });

        it('should return 500 on db error', async () => {
            (Vocabulary.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await vocabularyController.getVocabularies(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch vocabulary' });
        });
    });

    describe('addVocabulary', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await vocabularyController.addVocabulary(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 400 if word is missing', async () => {
            mockReq.body = { englishMeaning: 'test' };
            await vocabularyController.addVocabulary(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Word is required' });
        });

        it('should add a new vocabulary on success', async () => {
            mockReq.body = {
                word: 'hello',
                englishMeaning: 'greeting',
                vietnameseMeaning: 'chao',
                ipaSpelling: '/həˈləʊ/'
            };
            const mockVocab = { id: 1, ...mockReq.body, masteryLevel: 'New' };
            (Vocabulary.create as jest.Mock).mockResolvedValue(mockVocab);

            await vocabularyController.addVocabulary(mockReq as Request, mockRes as Response);

            expect(Vocabulary.create).toHaveBeenCalledWith({
                userId: 'test-user-id',
                word: 'hello',
                englishMeaning: 'greeting',
                vietnameseMeaning: 'chao',
                ipaSpelling: '/həˈləʊ/',
                masteryLevel: 'New'
            });
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ vocabulary: mockVocab });
        });

        it('should return 500 on db error', async () => {
            mockReq.body = { word: 'hello' };
            (Vocabulary.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await vocabularyController.addVocabulary(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to add vocabulary' });
        });
    });

    describe('updateVocabulary', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { id: '1' };
            await vocabularyController.updateVocabulary(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 404 if vocabulary not found', async () => {
            mockReq.params = { id: '1' };
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(null);

            await vocabularyController.updateVocabulary(mockReq as Request, mockRes as Response);

            expect(Vocabulary.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 'test-user-id' } });
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Vocabulary not found' });
        });

        it('should update vocabulary on success', async () => {
            mockReq.params = { id: '1' };
            mockReq.body = { word: 'world', masteryLevel: 'Familiar' };
            
            const mockVocabInstance = {
                id: '1',
                userId: 'test-user-id',
                word: 'hello',
                englishMeaning: 'greeting',
                vietnameseMeaning: 'chao',
                ipaSpelling: '/həˈləʊ/',
                masteryLevel: 'New',
                update: jest.fn().mockResolvedValue(true)
            };
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(mockVocabInstance);

            await vocabularyController.updateVocabulary(mockReq as Request, mockRes as Response);

            expect(mockVocabInstance.update).toHaveBeenCalledWith({
                word: 'world',
                englishMeaning: 'greeting',
                vietnameseMeaning: 'chao',
                ipaSpelling: '/həˈləʊ/',
                masteryLevel: 'Familiar'
            });
            expect(jsonMock).toHaveBeenCalledWith({ vocabulary: mockVocabInstance });
        });

        it('should return 500 on db error', async () => {
            mockReq.params = { id: '1' };
            (Vocabulary.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await vocabularyController.updateVocabulary(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to update vocabulary' });
        });
    });

    describe('deleteVocabulary', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { id: '1' };
            await vocabularyController.deleteVocabulary(mockReq as Request, mockRes as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 404 if vocabulary not found', async () => {
            mockReq.params = { id: '1' };
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(null);

            await vocabularyController.deleteVocabulary(mockReq as Request, mockRes as Response);

            expect(Vocabulary.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 'test-user-id' } });
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Vocabulary not found' });
        });

        it('should delete vocabulary on success', async () => {
            mockReq.params = { id: '1' };
            
            const mockVocabInstance = {
                id: '1',
                userId: 'test-user-id',
                destroy: jest.fn().mockResolvedValue(true)
            };
            (Vocabulary.findOne as jest.Mock).mockResolvedValue(mockVocabInstance);

            await vocabularyController.deleteVocabulary(mockReq as Request, mockRes as Response);

            expect(mockVocabInstance.destroy).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Vocabulary deleted successfully' });
        });

        it('should return 500 on db error', async () => {
            mockReq.params = { id: '1' };
            (Vocabulary.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await vocabularyController.deleteVocabulary(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to delete vocabulary' });
        });
    });
});
