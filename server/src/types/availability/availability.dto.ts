import { InferAttributes } from 'sequelize';
import TeacherAvailability from '../../models/TeacherAvailability';

export enum ReservationStatus {
    AVAILABLE = 'available',
    PENDING = 'pending',
    BOOKED = 'booked'
}

export interface TeacherAvailabilityDTO extends Omit<InferAttributes<TeacherAvailability>, 'isAvailable'> {
    reservationStatus: ReservationStatus;
}
