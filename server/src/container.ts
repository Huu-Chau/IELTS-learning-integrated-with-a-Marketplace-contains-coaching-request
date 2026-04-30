import { TeacherAvailabilityService } from "./services/teacherAvailabilityService";
import { TeacherAvailabilityController } from "./controllers/teacherAvailabilityController";
import { ReservationService } from './services/reservationService';
import { ReservationController } from './controllers/reservationController';

const teacherAvailabilityService = new TeacherAvailabilityService();
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);

const reservationService = new ReservationService();
export const reservationController = new ReservationController(reservationService);
