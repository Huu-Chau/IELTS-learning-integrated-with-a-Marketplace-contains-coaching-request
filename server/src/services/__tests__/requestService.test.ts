import MarketplaceRequest from '../../models/MarketplaceRequest';
import { RequestService, LegacyRequestPayload } from '../requestService';
import { MarketplaceRequestStatus, MarketplaceRequestType, UpdateRequestStatusPayload } from '../../types/marketplace-request';
import { Op } from 'sequelize';

jest.mock('../../models/MarketplaceRequest', () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
}));

describe('RequestService', () => {
    let requestService: RequestService;

    beforeEach(() => {
        jest.clearAllMocks();
        requestService = new RequestService();
    });

    describe('createRequest', () => {
        const mockPayload: LegacyRequestPayload = {
            studentId: 'student123',
            type: MarketplaceRequestType.BROADCAST,
            status: 'pending',
            message: 'Help with IELTS writing',
            skill: 'writing',
            budget: 50,
            createdAt: new Date().toISOString(),
        };

        const mockRequestInstance = {
            id: 1,
            studentId: 'student123',
            teacherId: null,
            status: MarketplaceRequestStatus.PENDING,
            message: 'Help with IELTS writing',
            skill: 'writing',
            fee: 50,
            requestType: MarketplaceRequestType.BROADCAST,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should create a request successfully', async () => {
            (MarketplaceRequest.create as jest.Mock).mockResolvedValue(mockRequestInstance);

            const result = await requestService.createRequest(mockPayload);

            expect(MarketplaceRequest.create).toHaveBeenCalledWith({
                studentId: mockPayload.studentId,
                teacherId: null,
                attemptId: null,
                status: MarketplaceRequestStatus.PENDING,
                message: mockPayload.message,
                skill: mockPayload.skill,
                fee: mockPayload.budget,
                requestType: mockPayload.type,
            });
            expect(result.id).toBe(mockRequestInstance.id);
            expect(result.studentId).toBe(mockRequestInstance.studentId);
        });

        it('should handle errors during request creation', async () => {
            const error = new Error('DB Error');
            (MarketplaceRequest.create as jest.Mock).mockRejectedValue(error);

            await expect(requestService.createRequest(mockPayload)).rejects.toThrow('DB Error');
        });
    });

    describe('getOpenRequests', () => {
        const mockRequests = [
            {
                id: 1,
                studentId: 's1',
                teacherId: null,
                status: 'pending',
                message: 'm1',
                skill: 's1',
                fee: 10,
                requestType: 'broadcast',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        it('should fetch all open requests', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue(mockRequests);

            const results = await requestService.getOpenRequests();

            expect(MarketplaceRequest.findAll).toHaveBeenCalledWith({
                where: { status: 'pending', requestType: { [Op.ne]: 'booking' } },
                order: [['createdAt', 'DESC']],
            });
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });

        it('should handle errors during fetching open requests', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(requestService.getOpenRequests()).rejects.toThrow('DB Error');
        });
    });

    describe('getRequestsForTeacher', () => {
        it('should fetch requests for a specific teacher', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([]);

            const teacherId = 'teacher123';
            await requestService.getRequestsForTeacher(teacherId);

            expect(MarketplaceRequest.findAll).toHaveBeenCalledWith({
                where: { teacherId, status: 'pending' },
                order: [['createdAt', 'DESC']],
            });
        });

        it('should handle errors during fetching requests for teacher', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(requestService.getRequestsForTeacher('t1')).rejects.toThrow('DB Error');
        });
    });

    describe('getRequestsByStudent', () => {
        it('should fetch requests for a specific student', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([]);

            const studentId = 'student123';
            await requestService.getRequestsByStudent(studentId);

            expect(MarketplaceRequest.findAll).toHaveBeenCalledWith({
                where: { studentId },
                order: [['createdAt', 'DESC']],
            });
        });

        it('should handle errors during fetching requests for student', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(requestService.getRequestsByStudent('s1')).rejects.toThrow('DB Error');
        });
    });

    describe('updateRequestStatus', () => {
        const mockRequestInstance = {
            id: 1,
            teacherId: null,
            update: jest.fn().mockResolvedValue(true),
        };

        it('should update status successfully', async () => {
            (MarketplaceRequest.findByPk as jest.Mock).mockResolvedValue(mockRequestInstance);

            await requestService.updateRequestStatus(new UpdateRequestStatusPayload('1', MarketplaceRequestStatus.ACCEPTED, 'teacher123'));

            expect(MarketplaceRequest.findByPk).toHaveBeenCalledWith(1);
            expect(mockRequestInstance.update).toHaveBeenCalledWith({
                status: MarketplaceRequestStatus.ACCEPTED,
                teacherId: 'teacher123',
            });
        });

        it('should update status without changing teacher if already set', async () => {
            const requestWithTeacher = { ...mockRequestInstance, teacherId: 'alreadySet' };
            (MarketplaceRequest.findByPk as jest.Mock).mockResolvedValue(requestWithTeacher);

            await requestService.updateRequestStatus(new UpdateRequestStatusPayload('1', MarketplaceRequestStatus.COMPLETED, 'somebodyElse'));

            expect(requestWithTeacher.update).toHaveBeenCalledWith({
                status: MarketplaceRequestStatus.COMPLETED,
            });
        });

        it('should throw error if request not found', async () => {
            (MarketplaceRequest.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(requestService.updateRequestStatus(new UpdateRequestStatusPayload('999', MarketplaceRequestStatus.ACCEPTED))).rejects.toThrow('Request 999 not found');
        });

        it('should handle errors during status update', async () => {
            (MarketplaceRequest.findByPk as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(requestService.updateRequestStatus(new UpdateRequestStatusPayload('1', MarketplaceRequestStatus.ACCEPTED))).rejects.toThrow('DB Error');
        });
    });
});
