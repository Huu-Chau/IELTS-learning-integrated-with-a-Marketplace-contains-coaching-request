import { TeacherAvailabilityService } from "./services/teacherAvailabilityService";
import { TeacherAvailabilityController } from "./controllers/teacherAvailabilityController";
import { ReservationService } from './services/reservationService';
import { ReservationController } from './controllers/reservationController';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { AttemptService } from './services/attemptService';
import { AttemptController } from './controllers/attemptController';
import { CambridgeTestService } from './services/cambridgeTestService';
import { CambridgeTestController } from './controllers/CambridgeTestController';
import { WritingEvaluationService } from './services/writingEvaluationService';
import { WritingEvaluationController } from './controllers/writingEvaluationController';
import { MarketplaceService } from './services/marketplaceService';
import { MarketplaceController } from './controllers/marketplaceController';
import { MessageService } from './services/messageService';
import { MessageController } from './controllers/messageController';
import { NotificationService } from './services/notificationService';
import { NotificationController } from './controllers/notificationController';
import { RequestService } from './services/requestService';
import { RequestController } from './controllers/requestController';
import { storageProvider } from './services/storage/StorageService';

// Services
const teacherAvailabilityService = new TeacherAvailabilityService();
const reservationService = new ReservationService();
const authService = new AuthService();
const attemptService = new AttemptService();
const cambridgeTestService = new CambridgeTestService(storageProvider);
const writingEvaluationService = new WritingEvaluationService(storageProvider);
const marketplaceService = new MarketplaceService();
const messageService = new MessageService();
const notificationService = new NotificationService();
const requestService = new RequestService();

// Controllers
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);
export const reservationController = new ReservationController(reservationService);
export const authController = new AuthController(authService);
export const attemptController = new AttemptController(attemptService);
export const cambridgeTestController = new CambridgeTestController(cambridgeTestService);
export const writingEvaluationController = new WritingEvaluationController(writingEvaluationService);
export const marketplaceController = new MarketplaceController(marketplaceService, teacherAvailabilityService);
export const messageController = new MessageController(messageService);
export const notificationController = new NotificationController(notificationService);
export const requestController = new RequestController(requestService);
