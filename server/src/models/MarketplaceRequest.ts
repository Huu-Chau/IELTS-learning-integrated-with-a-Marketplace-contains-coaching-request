import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/**
 * MarketplaceRequest model - manages student-teacher review requests.
 * Links students to teachers for paid IELTS feedback.
 *
 * Unified model that replaces both the old Firestore-based request system
 * and serves the new marketplace booking flow.
 */
class MarketplaceRequest extends Model {
    declare id: number;
    declare studentId: string;            // Firebase UID
    declare reservationId: number;       // FK → Reservation
    declare teacherId: string | null;     // Firebase UID (nullable for broadcast requests)
    declare attemptId: number | null;     // Optional — links to Attempts table
    declare status: 'pending' | 'accepted' | 'completed' | 'rejected';
    declare feedbackPath: string | null;
    declare fee: number;
    declare message: string | null;       // Student's message / description
    declare skill: string | null;         // e.g. 'Writing', 'Speaking'
    declare requestType: string;          // 'broadcast' | 'targeted' | 'booking'
    // declare scheduledAt: Date | null;     // The specific time-slot booked
    // declare durationMinutes: number;      // Duration of the booking
    declare createdAt: Date;
    declare updatedAt: Date;
}

MarketplaceRequest.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        studentId: {
            type: DataTypes.STRING(128),
            allowNull: false,
            references: { model: 'Users', key: 'id' },
        },
        reservationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Reservations', key: 'id' },
        },
        teacherId: {
            type: DataTypes.STRING(128),
            allowNull: true,
            references: { model: 'Users', key: 'id' },
        },
        attemptId: {
            type: DataTypes.INTEGER,
            allowNull: true,  // Now nullable — not all requests link to an attempt
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
        },
        feedbackPath: {
            type: DataTypes.STRING,
        },
        fee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        skill: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        requestType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'booking',
        },
        // scheduledAt: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        // },
        // durationMinutes: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     defaultValue: 60,
        // },
    },
    {
        sequelize,
        modelName: 'MarketplaceRequest',
        tableName: 'MarketplaceRequests',
        hooks: {
            afterCreate: async (request) => {
                try {
                    const Notification = (await import('./Notification')).default;
                    const User = (await import('./User')).default;

                    const teacher = request.teacherId ? await User.findByPk(request.teacherId) : null;
                    const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : 'a teacher';

                    await Notification.create({
                        userId: request.studentId,
                        type: 'marketplace',
                        title: 'Review Request Pending',
                        body: `Your expert review request is waiting. We'll notify you when ${teacherName} responds.`,
                        linkPath: '/my-requests',
                        isRead: true // Don't trigger unread badge for creating your own request
                    });
                } catch (err) {
                    console.error('[MarketplaceRequest Hook] afterCreate error', err);
                }
            },
            afterUpdate: async (request, options) => {
                if (request.changed('status')) {
                    try {
                        const Notification = (await import('./Notification')).default;
                        const User = (await import('./User')).default;

                        const teacher = request.teacherId ? await User.findByPk(request.teacherId) : null;
                        const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : 'a teacher';

                        const statusMessages: Record<string, { title: string; body: string }> = {
                            accepted: {
                                title: '🎉 Request Accepted!',
                                body: `${teacherName} has accepted your review request. Check your requests page.`,
                            },
                            completed: {
                                title: '✅ Review Completed',
                                body: `${teacherName} has completed your IELTS review. Your feedback is ready!`,
                            },
                            rejected: {
                                title: 'Request Declined',
                                body: `${teacherName} was unable to accept your request. Try another tutor.`,
                            },
                        };

                        const msg = statusMessages[request.status];
                        if (msg) {
                            await Notification.create({
                                userId: request.studentId,
                                type: 'marketplace',
                                title: msg.title,
                                body: msg.body,
                                linkPath: '/my-requests',
                                isRead: false // Trigger unread badge
                            });
                        }
                    } catch (err) {
                        console.error('[MarketplaceRequest Hook] afterUpdate error', err);
                    }
                }
            }
        }
    }
);

export default MarketplaceRequest;
