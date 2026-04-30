import { TeacherAvailabilityService } from "./services/teacherAvailabilityService";
import { TeacherAvailabilityController } from "./controllers/teacherAvailabilityController";

const teacherAvailabilityService = new TeacherAvailabilityService();
export const teacherAvailabilityController = new TeacherAvailabilityController(teacherAvailabilityService);
