import { QueueMessage, QueueTopic } from '../types/queue/queue.types';
import { IQueueProvider } from '../services/queue/IQueueProvider';
import { IConsumer } from '.';
import { INotificationService } from '../services/notificationService';
import { IMarketplaceRequestAttributes } from '../models/MarketplaceRequest';
import { CreateNotificationPayload, NotificationType } from '../types/notification';
import { userService } from '../services/userService';
import { MarketplaceRequestStatus } from '../types/marketplace-request';

export class NotificationOnMarketplaceRequestCreatedConsumer implements IConsumer {
    constructor(
        private readonly queueService: IQueueProvider,
        private readonly notificationService: INotificationService,
    ) { }

    async consume(): Promise<void> {
        return this.queueService.consume(QueueTopic.MARKETPLACE_REQUEST_CREATED, "notifications", async (message: QueueMessage<IMarketplaceRequestAttributes>) => {
            console.log('[NotificationOnMarketplaceRequestCreatedConsumer] 🚀 Message received in consumer', message);
            try {
                const request = message.data;
                const teacherId = request.teacherId as string; // Always have teacherId in this case
                const [teacher, student] = await Promise.all([
                    userService.getUserById(teacherId),
                    userService.getUserById(request.studentId)
                ]);
                const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : 'a teacher';
                const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'a student';

                switch (request.status) {
                    case MarketplaceRequestStatus.PENDING: // book and wait for teacher to accept or reject
                        const serviceLabelPending = request.skill ? `IELTS ${request.skill} Review` : 'IELTS Review';
                        const amountFormatted = request.fee.toLocaleString('vi-VN');

                        const pendingStudentPayload = new CreateNotificationPayload(
                            request.studentId,
                            NotificationType.MARKETPLACE,
                            'Review Request Pending',
                            `Your expert review request is waiting. We'll notify you when ${teacherName} responds.`,
                            '/my-requests',
                            false,
                        );
                        
                        const pendingTeacherPayload = new CreateNotificationPayload(
                            teacherId,
                            NotificationType.ORDER,
                            '🛎️ New Booking Request',
                            `${studentName} has booked your "${serviceLabelPending}" service for ${amountFormatted} VND. Please review and accept.`,
                            '/teacher/marketplace',
                        );
                        
                        await Promise.all([
                            this.notificationService.createNotification(pendingStudentPayload),
                            this.notificationService.createNotification(pendingTeacherPayload),
                        ]);
                        break;
                    case MarketplaceRequestStatus.ACCEPTED: // booking via availability slots, api reservation pay called
                        const serviceLabel = request.skill ? `IELTS ${request.skill} Coaching` : 'IELTS Coaching';
                        const priceFormatted = request.fee.toLocaleString('vi-VN');

                        const studentPayload = new CreateNotificationPayload(
                            request.studentId,
                            NotificationType.PAYMENT,
                            '🎉 Booking Confirmed!',
                            `You've successfully booked "${serviceLabel}" with ${teacherName} for ${priceFormatted} 🧠 Credits.`,
                            '/my-requests',
                        );
                        const teacherPayload = new CreateNotificationPayload(
                            teacherId,
                            NotificationType.ORDER,
                            '🛎️ New Session Booked!',
                            `${studentName} has confirmed a booking for "${serviceLabel}". ${priceFormatted} 🧠 Credits are held in escrow and will be transferred to your wallet after completion.`,
                            '/teacher/marketplace',
                        );
                        await Promise.all([
                            this.notificationService.createNotification(studentPayload),
                            this.notificationService.createNotification(teacherPayload),
                        ]);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error('[NotificationOnMarketplaceRequestCreatedConsumer] Failed to create notification:', err);
                throw err;
            }
        })
    }
}