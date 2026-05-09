import request from 'supertest';
import express from 'express';

// Mock models before importing routes
jest.mock('../../models/TeacherListing', () => ({
    findAll: jest.fn(),
    findOne: jest.fn(),
}));
jest.mock('../../models/MarketplaceRequest', () => ({
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
}));
jest.mock('../../models/User', () => ({
    findByPk: jest.fn(),
}));
jest.mock('../../models/Reservation', () => ({
    findOne: jest.fn(),
}));
jest.mock('../../models/Notification', () => ({}));

// Create shared mock functions for services
const mockGetAvailability = jest.fn();
const mockCreateNotification = jest.fn();

// Mock services
jest.mock('../../services/teacherAvailabilityService', () => ({
    TeacherAvailabilityService: jest.fn().mockImplementation(() => ({
        getAvailability: mockGetAvailability,
    })),
}));
jest.mock('../../services/notificationService', () => ({
    NotificationService: jest.fn().mockImplementation(() => ({
        createNotification: mockCreateNotification,
    })),
}));

// Mock auth middleware
jest.mock('../../middleware/authMiddleware', () => ({
    verifyToken: () => (req: any, res: any, next: any) => {
        req.user = { uid: 'student-123' };
        next();
    }
}));

// Now import the router
import router from '../marketplaceRoutes';
import TeacherListing from '../../models/TeacherListing';
import MarketplaceRequest from '../../models/MarketplaceRequest';
import User from '../../models/User';
import Reservation from '../../models/Reservation';

const app = express();
app.use(express.json());
app.use('/api/marketplace', router);

describe('MarketplaceRoutes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /listings', () => {
        it('should return enriched listings', async () => {
            const mockListings = [
                {
                    id: 'listing-1',
                    teacherId: 'teacher-1',
                    title: 'IELTS Speaking',
                    description: 'Practice speaking',
                    skills: ['Speaking'],
                    pricePerHour: 20,
                    sessionDuration: 60,
                    isActive: true,
                    createdAt: new Date(),
                }
            ];

            (TeacherListing.findAll as jest.Mock).mockResolvedValue(mockListings);
            (User.findByPk as jest.Mock).mockResolvedValue({
                id: 'teacher-1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            });
            (Reservation.findOne as jest.Mock).mockResolvedValue(null);

            const response = await request(app).get('/api/marketplace/listings');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].title).toBe('IELTS Speaking');
            expect(response.body[0].teacher.name).toBe('John Doe');
        });

        it('should handle errors', async () => {
            (TeacherListing.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).get('/api/marketplace/listings');
            expect(response.status).toBe(500);
        });
    });

    describe('GET /listings/:id', () => {
        it('should return a single listing', async () => {
            const mockListing = {
                id: 'listing-1',
                teacherId: 'teacher-1',
                title: 'IELTS Speaking',
                description: 'Practice speaking',
                skills: ['Speaking'],
                pricePerHour: 20,
                sessionDuration: 60,
                isActive: true,
                createdAt: new Date(),
            };

            (TeacherListing.findOne as jest.Mock).mockResolvedValue(mockListing);
            (User.findByPk as jest.Mock).mockResolvedValue({
                id: 'teacher-1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            });

            const response = await request(app).get('/api/marketplace/listings/listing-1');

            expect(response.status).toBe(200);
            expect(response.body.id).toBe('listing-1');
        });

        it('should return 404 if listing not found', async () => {
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);
            const response = await request(app).get('/api/marketplace/listings/non-existent');
            expect(response.status).toBe(404);
        });
    });

    describe('POST /requests', () => {
        it('should create a new request', async () => {
            const mockListing = {
                id: 'listing-1',
                teacherId: 'teacher-1',
                pricePerHour: 25,
                skills: ['Writing'],
                title: 'Writing Review'
            };

            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(null);
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(mockListing);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'Student', lastName: 'User' });
            (MarketplaceRequest.create as jest.Mock).mockResolvedValue({
                id: 'req-1',
                studentId: 'student-123',
                teacherId: 'teacher-1',
                fee: 25,
                status: 'pending',
                toJSON: () => ({ id: 'req-1', studentId: 'student-123', teacherId: 'teacher-1', fee: 25, status: 'pending' })
            });

            const response = await request(app)
                .post('/api/marketplace/requests')
                .send({ listingId: 'listing-1', teacherId: 'teacher-1' });

            expect(response.status).toBe(201);
            expect(response.body.id).toBe('req-1');
            expect(MarketplaceRequest.create).toHaveBeenCalled();
        });

        it('should return 400 if already has pending request', async () => {
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue({ id: 'existing-req' });
            const response = await request(app)
                .post('/api/marketplace/requests')
                .send({ listingId: 'listing-1', teacherId: 'teacher-1' });
            expect(response.status).toBe(400);
        });

        it('should return 404 if listing not found', async () => {
            (MarketplaceRequest.findOne as jest.Mock).mockResolvedValue(null);
            (TeacherListing.findOne as jest.Mock).mockResolvedValue(null);
            const response = await request(app)
                .post('/api/marketplace/requests')
                .send({ listingId: 'invalid', teacherId: 'teacher-1' });
            expect(response.status).toBe(404);
        });
    });

    describe('GET /requests/mine', () => {
        it('should return student requests', async () => {
            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { id: 'req-1', teacherId: 'teacher-1', status: 'pending', fee: 20 }
            ]);
            (User.findByPk as jest.Mock).mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

            const response = await request(app).get('/api/marketplace/requests/mine');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].teacherName).toBe('John Doe');
        });
    });

    describe('GET /payments', () => {
        it('should return payment history', async () => {
            (User.findByPk as jest.Mock)
                .mockResolvedValueOnce({ wallet_balance: 100 }) // for student
                .mockResolvedValueOnce({ firstName: 'John', lastName: 'Doe' }); // for teacher

            (MarketplaceRequest.findAll as jest.Mock).mockResolvedValue([
                { id: 'req-1', teacherId: 'teacher-1', status: 'completed', fee: 20, skill: 'Writing' }
            ]);

            const response = await request(app).get('/api/marketplace/payments');

            expect(response.status).toBe(200);
            expect(response.body.walletBalance).toBe(100);
            expect(response.body.payments).toHaveLength(1);
            expect(response.body.totalSpent).toBe(20);
        });
    });

    describe('GET /teachers/:uid/availability', () => {
        it('should return teacher availability', async () => {
            const mockAvailability = [{ start: new Date(), end: new Date() }];
            mockGetAvailability.mockResolvedValue(mockAvailability);

            const response = await request(app).get('/api/marketplace/teachers/teacher-1/availability');

            expect(response.status).toBe(200);
            expect(response.body.slots).toHaveLength(1);
        });
    });
});
