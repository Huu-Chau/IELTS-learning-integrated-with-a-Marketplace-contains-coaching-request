import { Request, Response, NextFunction } from 'express';
import { VocabularyController } from '../vocabularyController';
import { IVocabularyService } from '../../services/vocabularyService';
import { AddVocabularyPayload, UpdateVocabularyPayload, MasteryLevel } from '../../types/vocabulary';

describe('VocabularyController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let mockVocabularyService: jest.Mocked<IVocabularyService>;
    let controller: VocabularyController;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockNext = jest.fn();
        mockReq = {
            user: { uid: 'test-user-id', email: 'test@example.com' },
            params: {},
            body: {}
        } as Partial<Request>;
        mockRes = {
            status: statusMock,
            json: jsonMock
        };
        mockVocabularyService = {
            getVocabularies: jest.fn(),
            addVocabulary: jest.fn(),
            updateVocabulary: jest.fn(),
            deleteVocabulary: jest.fn()
        };
        controller = new VocabularyController(mockVocabularyService);
        jest.clearAllMocks();
    });

    describe('getVocabularies', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await controller.getVocabularies(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalledWith(expect.anything());
        });

        it('should return vocabularies on success', async () => {
            const mockVocabs = [{ id: 1, word: 'test' }] as any;
            mockVocabularyService.getVocabularies.mockResolvedValue(mockVocabs);

            await controller.getVocabularies(mockReq as Request, mockRes as Response, mockNext);

            expect(mockVocabularyService.getVocabularies).toHaveBeenCalledWith('test-user-id');
            expect(jsonMock).toHaveBeenCalledWith({ vocabularies: mockVocabs });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 on service error', async () => {
            mockVocabularyService.getVocabularies.mockRejectedValue(new Error('Service Error'));

            await controller.getVocabularies(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch vocabulary' });
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('addVocabulary', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            await controller.addVocabulary(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 400 if word is missing', async () => {
            mockReq.body = { englishMeaning: 'test' };
            await controller.addVocabulary(mockReq as Request, mockRes as Response, mockNext);
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
            mockVocabularyService.addVocabulary.mockResolvedValue(mockVocab as any);

            await controller.addVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(mockVocabularyService.addVocabulary).toHaveBeenCalledWith(
                'test-user-id',
                expect.any(AddVocabularyPayload)
            );
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ vocabulary: mockVocab });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 on service error', async () => {
            mockReq.body = { word: 'hello' };
            mockVocabularyService.addVocabulary.mockRejectedValue(new Error('Service Error'));

            await controller.addVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to add vocabulary' });
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('updateVocabulary', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { id: '1' };
            await controller.updateVocabulary(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 404 if vocabulary not found', async () => {
            mockReq.params = { id: '1' };
            mockVocabularyService.updateVocabulary.mockResolvedValue(null);

            await controller.updateVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(mockVocabularyService.updateVocabulary).toHaveBeenCalledWith(
                'test-user-id',
                '1',
                expect.any(UpdateVocabularyPayload)
            );
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Vocabulary not found' });
        });

        it('should update vocabulary on success', async () => {
            mockReq.params = { id: '1' };
            mockReq.body = { word: 'world', masteryLevel: MasteryLevel.LEARNING };
            
            const mockVocab = {
                id: '1',
                userId: 'test-user-id',
                word: 'world',
                masteryLevel: MasteryLevel.LEARNING
            };
            mockVocabularyService.updateVocabulary.mockResolvedValue(mockVocab as any);

            await controller.updateVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(mockVocabularyService.updateVocabulary).toHaveBeenCalledWith(
                'test-user-id',
                '1',
                expect.objectContaining({ word: 'world', masteryLevel: MasteryLevel.LEARNING })
            );
            expect(jsonMock).toHaveBeenCalledWith({ vocabulary: mockVocab });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 on service error', async () => {
            mockReq.params = { id: '1' };
            mockVocabularyService.updateVocabulary.mockRejectedValue(new Error('Service Error'));

            await controller.updateVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to update vocabulary' });
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('deleteVocabulary', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { id: '1' };
            await controller.deleteVocabulary(mockReq as Request, mockRes as Response, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 404 if vocabulary not found', async () => {
            mockReq.params = { id: '1' };
            mockVocabularyService.deleteVocabulary.mockResolvedValue(false);

            await controller.deleteVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(mockVocabularyService.deleteVocabulary).toHaveBeenCalledWith('test-user-id', '1');
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Vocabulary not found' });
        });

        it('should delete vocabulary on success', async () => {
            mockReq.params = { id: '1' };
            mockVocabularyService.deleteVocabulary.mockResolvedValue(true);

            await controller.deleteVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(mockVocabularyService.deleteVocabulary).toHaveBeenCalledWith('test-user-id', '1');
            expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Vocabulary deleted successfully' });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 500 on service error', async () => {
            mockReq.params = { id: '1' };
            mockVocabularyService.deleteVocabulary.mockRejectedValue(new Error('Service Error'));

            await controller.deleteVocabulary(mockReq as Request, mockRes as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to delete vocabulary' });
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
