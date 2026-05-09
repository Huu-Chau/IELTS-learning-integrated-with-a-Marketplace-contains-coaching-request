import request from 'supertest';
import express from 'express';
import reservationRoutes from '../reservationRoutes';
import Reservation from '../../models/Reservation';
import { reservationController } from '../../container';
import { verifyToken } from '../../middleware/authMiddleware';

// Mock models and services
jest.mock('../../models/Reservation');
jest.mock('../../container', () => ({
    reservationController: {
        payForReservation: jest.fn(),
    },
}));
jest.mock('../../middleware/authMiddleware', () => ({
    verifyToken: jest.fn(() => (req: any, res: any, next: any) => {
        req.user = { uid: 'test-user-id' };
        next();
    }),
}));

const app = express();
app.use(express.json());
app.use('/api/reservations', reservationRoutes);

describe('Reservation Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/reservations/:reservationId/pay', () => {
        it('should call reservationController.payForReservation and return success', async () => {
            (reservationController.payForReservation as jest.Mock).mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app).post('/api/reservations/1/pay');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
            expect(reservationController.payForReservation).toHaveBeenCalled();
        });

        it('should return 500 if reservationController.payForReservation throws', async () => {
            (reservationController.payForReservation as jest.Mock).mockImplementation(() => {
                throw new Error('Payment failed');
            });

            const response = await request(app).post('/api/reservations/1/pay');

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Payment failed');
            expect(reservationController.payForReservation).toHaveBeenCalled();
        });
    });

    describe('GET /api/reservations/listing/:listingId', () => {
        it('should return status available if no active reservation exists', async () => {
            (Reservation.update as jest.Mock).mockResolvedValue([0]);
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);

            const response = await request(app).get('/api/reservations/listing/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'available' });
            expect(Reservation.findOne).toHaveBeenCalled();
        });

        it('should return status pending and isOwn true if own reservation exists', async () => {
            (Reservation.update as jest.Mock).mockResolvedValue([0]);
            const mockReservation = {
                id: 123,
                studentId: 'test-user-id',
                expiresAt: new Date(Date.now() + 300000),
                version: 1,
            };
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);

            const response = await request(app).get('/api/reservations/listing/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'pending',
                isOwn: true,
                expiresAt: mockReservation.expiresAt.toISOString(),
                reservationId: 123,
                version: 1,
            });
        });

        it('should return status pending and isOwn false if another student has reservation', async () => {
            (Reservation.update as jest.Mock).mockResolvedValue([0]);
            const mockReservation = {
                id: 456,
                studentId: 'other-user-id',
                expiresAt: new Date(Date.now() + 300000),
                version: 1,
            };
            (Reservation.findOne as jest.Mock).mockResolvedValue(mockReservation);

            const response = await request(app).get('/api/reservations/listing/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'pending',
                isOwn: false,
                expiresAt: mockReservation.expiresAt.toISOString(),
            });
            expect(response.body.reservationId).toBeUndefined();
        });

        it('should return 500 if database query fails', async () => {
            (Reservation.update as jest.Mock).mockResolvedValue([0]);
            (Reservation.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const response = await request(app).get('/api/reservations/listing/1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch reservation status');
        });

        it('should call expireStaleReservations and update expired rows', async () => {
            (Reservation.update as jest.Mock).mockResolvedValue([5]); // 5 rows expired
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);

            await request(app).get('/api/reservations/listing/1');

            expect(Reservation.update).toHaveBeenCalledWith(
                { status: 'expired' },
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'pending',
                        expiresAt: expect.anything(),
                    }),
                })
            );
        });
    });
});
