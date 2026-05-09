import { TeacherAvailabilityService } from "./services/teacherAvailabilityService";
import { TeacherAvailabilityController } from "./controllers/teacherAvailabilityController";
import { ReservationService } from './services/reservationService';
import { ReservationController } from './controllers/reservationController';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';

// Services
const teacherAvailabilityService = new TeacherAvailabilityService();
const reservationService = new ReservationService();
const authService = new AuthService();

// Controllers
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);
export const reservationController = new ReservationController(reservationService);
export const authController = new AuthController(authService);
