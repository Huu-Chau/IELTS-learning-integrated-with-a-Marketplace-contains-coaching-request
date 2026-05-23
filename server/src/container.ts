import { TeacherAvailabilityService } from "./services/teacherAvailabilityService";
import { TeacherAvailabilityController } from "./controllers/teacherAvailabilityController";
import { TeacherService } from "./services/teacherService";
import { TeacherController } from "./controllers/teacherController";
import { ReservationService } from './services/reservationService';
import { ReservationController } from './controllers/reservationController';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { AttemptService } from './services/attemptService';
import { AttemptController } from './controllers/attemptController';
import { CambridgeTestServiceV2 } from './services/cambridgeTestService';
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
import { UserService } from "./services/userService";
import { UserController } from "./controllers/userController";
import { VocabularyService } from "./services/vocabularyService";
import { VocabularyController } from "./controllers/vocabularyController";
import { storageProvider } from './services/storage/StorageService';

// Services
const teacherAvailabilityService = new TeacherAvailabilityService();
const reservationService = new ReservationService();
const authService = new AuthService();

const attemptService = new AttemptService();
console.log('=== attempService:', attemptService);
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(attemptService)));


const cambridgeTestService = new CambridgeTestServiceV2(storageProvider);
const writingEvaluationService = new WritingEvaluationService(storageProvider);
const marketplaceService = new MarketplaceService();
const messageService = new MessageService();
const notificationService = new NotificationService();
const requestService = new RequestService();
const userService = new UserService();
const vocabularyService = new VocabularyService();
const teacherService = new TeacherService(notificationService);

// Controllers
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);
export const reservationController = new ReservationController(reservationService);
export const authController = new AuthController(authService);
export const attemptController = new AttemptController(attemptService, storageProvider);
export const cambridgeTestController = new CambridgeTestController(cambridgeTestService);
export const writingEvaluationController = new WritingEvaluationController(writingEvaluationService);
export const marketplaceController = new MarketplaceController(marketplaceService, teacherAvailabilityService);
export const messageController = new MessageController(messageService);
export const notificationController = new NotificationController(notificationService);
export const requestController = new RequestController(requestService);
export const userController = new UserController(userService);
export const teacherController = new TeacherController(teacherService, messageService, notificationService);
export const vocabularyController = new VocabularyController(vocabularyService);
