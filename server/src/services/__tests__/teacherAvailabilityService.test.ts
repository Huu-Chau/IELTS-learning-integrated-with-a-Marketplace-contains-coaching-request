import TeacherAvailability from '../../models/TeacherAvailability';
import TeacherListing from '../../models/TeacherListing';
import Reservation from '../../models/Reservation';
import sequelize from '../../config/database';
import { TeacherAvailabilityService } from '../teacherAvailabilityService';
import { Op } from 'sequelize';

jest.mock('../../config/database', () => ({
    transaction: jest.fn(),
    literal: jest.fn((val) => val),
}));

jest.mock('../../models/TeacherAvailability', () => ({
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
}));

jest.mock('../../models/TeacherListing', () => ({
    findOne: jest.fn(),
}));

jest.mock('../../models/Reservation', () => ({
    create: jest.fn(),
}));

describe('TeacherAvailabilityService', () => {
    let service: TeacherAvailabilityService;

    beforeEach(() => {
        service = new TeacherAvailabilityService();
        jest.clearAllMocks();
    });

    describe('createAvailability', () => {
        it('should create a new availability', async () => {
            const payload = {
                teacherId: 'teacher-1',
                date: '2023-10-01',
                startTime: '09:00',
                endTime: '10:00',
                timezone: 'UTC'
            };

            const mockAvailability = { ...payload, id: 1, isAvailable: true };
            (TeacherAvailability.create as jest.Mock).mockResolvedValue(mockAvailability);

            const result = await service.createAvailability(payload);

            expect(TeacherAvailability.create).toHaveBeenCalledWith({
                ...payload,
                isAvailable: true
            });
            expect(result).toEqual(mockAvailability);
        });
    });

    describe('updateAvailability', () => {
        it('should update an existing availability', async () => {
            const payload = {
                id: 1,
                teacherId: 'teacher-1',
                date: '2023-10-02',
                startTime: '10:00',
                endTime: '11:00',
                timezone: 'UTC',
                isAvailable: false
            };

            const mockAvailability = {
                update: jest.fn().mockResolvedValue(undefined)
            };
            (TeacherAvailability.findOne as jest.Mock).mockResolvedValue(mockAvailability);

            await service.updateAvailability(payload);

            expect(TeacherAvailability.findOne).toHaveBeenCalledWith({
                where: { id: payload.id, teacherId: payload.teacherId }
            });
            expect(mockAvailability.update).toHaveBeenCalledWith({
                date: payload.date,
                startTime: payload.startTime,
                endTime: payload.endTime,
                timezone: payload.timezone,
                isAvailable: payload.isAvailable
            });
        });

        it('should throw error if availability not found', async () => {
            (TeacherAvailability.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.updateAvailability({ id: 1, teacherId: 't1' } as any))
                .rejects.toThrow('Availability not found');
        });
    });

    describe('bookAvailability', () => {
        let mockTransaction: any;

        beforeEach(() => {
            mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn(),
                LOCK: { UPDATE: 'UPDATE' }
            };
            (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
        });

        it('should book availability and create reservation', async () => {
            const payload = {
                availabilityId: 1,
                studentId: 'student-1',
                listingId: 1
            };

            const mockListing = {
                id: 1,
                pricePerHour: 50,
                toJSON: () => ({ id: 1, pricePerHour: 50 })
            };
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(mockListing);
            (TeacherAvailability.update as jest.Mock).mockResolvedValue([1]);
            (Reservation.create as jest.Mock).mockResolvedValue({ id: 'res-1' });

            const result = await service.bookAvailability(payload);

            expect(sequelize.transaction).toHaveBeenCalled();
            expect(TeacherListing.findOne).toHaveBeenCalledWith({
                where: { id: payload.listingId, isActive: true },
                lock: mockTransaction.LOCK.UPDATE
            });
            expect(TeacherAvailability.update).toHaveBeenCalledWith(
                { isAvailable: false },
                { where: { id: payload.availabilityId, isAvailable: true }, transaction: mockTransaction }
            );
            expect(Reservation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    availabilityId: payload.availabilityId,
                    studentId: payload.studentId,
                    fee: 50,
                    status: 'pending'
                }),
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual({ id: 'res-1' });
        });

        it('should throw error if listing not found', async () => {
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.bookAvailability({ listingId: 1 } as any))
                .rejects.toThrow('Listing not found');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });

        it('should throw error if availability already booked or not found', async () => {
            (TeacherListing.findOne as jest.Mock).mockResolvedValue({ toJSON: () => ({}) });
            (TeacherAvailability.update as jest.Mock).mockResolvedValue([0]);

            await expect(service.bookAvailability({ availabilityId: 1 } as any))
                .rejects.toThrow('Availability not found or already booked');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('getAvailability', () => {
        it('should return availabilities for a teacher with date range', async () => {
            const params = {
                teacherId: 'teacher-1',
                from: new Date('2023-10-01'),
                to: new Date('2023-10-07')
            };

            const mockAvailabilities = [{ id: 1 }];
            (TeacherAvailability.findAll as jest.Mock).mockResolvedValue(mockAvailabilities);

            const result = await service.getAvailability(params);

            expect(TeacherAvailability.findAll).toHaveBeenCalledWith({
                where: {
                    teacherId: 'teacher-1',
                    date: { [Op.between]: [params.from, params.to] }
                }
            });
            expect(result).toEqual(mockAvailabilities);
        });

        it('should return availabilities for a teacher without date range', async () => {
            const params = { teacherId: 'teacher-1' };
            const mockAvailabilities = [{ id: 1 }];
            (TeacherAvailability.findAll as jest.Mock).mockResolvedValue(mockAvailabilities);

            const result = await service.getAvailability(params);

            expect(TeacherAvailability.findAll).toHaveBeenCalledWith({
                where: { teacherId: 'teacher-1' }
            });
            expect(result).toEqual(mockAvailabilities);
        });
    });

    describe('deleteAvailability', () => {
        it('should delete availability if not booked', async () => {
            const payload = { id: 1, teacherId: 'teacher-1' };
            (TeacherAvailability.destroy as jest.Mock).mockResolvedValue(1);

            await service.deleteAvailability(payload);

            expect(TeacherAvailability.destroy).toHaveBeenCalledWith({
                where: {
                    id: payload.id,
                    teacherId: payload.teacherId,
                    isAvailable: true
                }
            });
        });

        it('should throw error if delete fails', async () => {
            (TeacherAvailability.destroy as jest.Mock).mockResolvedValue(0);

            await expect(service.deleteAvailability({ id: 1, teacherId: 't1' }))
                .rejects.toThrow('Availability not found or already booked');
        });
    });
});
