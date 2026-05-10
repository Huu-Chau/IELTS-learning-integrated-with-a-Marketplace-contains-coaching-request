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
import { storageProvider } from './services/storage/StorageService';

// Services
const teacherAvailabilityService = new TeacherAvailabilityService();
const reservationService = new ReservationService();
const authService = new AuthService();
const attemptService = new AttemptService();
const cambridgeTestService = new CambridgeTestService(storageProvider);
const writingEvaluationService = new WritingEvaluationService(storageProvider);
const marketplaceService = new MarketplaceService();

// Controllers
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);
export const reservationController = new ReservationController(reservationService);
export const authController = new AuthController(authService);
export const attemptController = new AttemptController(attemptService);
export const cambridgeTestController = new CambridgeTestController(cambridgeTestService);
export const writingEvaluationController = new WritingEvaluationController(writingEvaluationService);
export const marketplaceController = new MarketplaceController(marketplaceService, teacherAvailabilityService);
