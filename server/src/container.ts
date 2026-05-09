import { TeacherAvailabilityService } from "./services/teacherAvailabilityService";
import { TeacherAvailabilityController } from "./controllers/teacherAvailabilityController";
import { ReservationService } from './services/reservationService';
import { ReservationController } from './controllers/reservationController';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { AttemptService } from './services/attemptService';
import { AttemptController } from './controllers/attemptController';

// Services
const teacherAvailabilityService = new TeacherAvailabilityService();
const reservationService = new ReservationService();
const authService = new AuthService();
const attemptService = new AttemptService();

// Controllers
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);
export const reservationController = new ReservationController(reservationService);
export const authController = new AuthController(authService);
export const attemptController = new AttemptController(attemptService);
