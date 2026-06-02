import dotenv from 'dotenv';
dotenv.config();

import sequelize from './config/database';
import { queueService } from './services/queue/queueProvider';
import './models/Notification';
import {
    NotificationOnAttemptCreatedConsumer,
    NotificationOnMarketplaceRequestCreatedConsumer,
    NotificationOnMarketplaceRequestStatusUpdatedConsumer,
    NotificationOnWritingSessionStatusUpdatedConsumer,
    MessageOnMarketplaceRequestStatusUpdatedConsumer,
} from './consumers';
import { INotificationService, NotificationService } from './services/notificationService';
import { IMessageService, MessageService } from './services/messageService';
import { IUserService, UserService } from './services/userService';

const notificationService: INotificationService = new NotificationService();
const messageService: IMessageService = new MessageService();
const userService: IUserService = new UserService();


console.log('[Consumer] Starting standalone consumer process...');

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Consumer] Received ${signal}. Starting graceful shutdown...`);
    try {
        if (queueService.disconnect) {
            await queueService.disconnect();
        }
        await sequelize.close();
        console.log('[Consumer] ✅ Graceful shutdown complete.');
        process.exit(0);
    } catch (err) {
        console.error('[Consumer] ❌ Error during graceful shutdown:', err);
        process.exit(1);
    }
}

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

sequelize.authenticate()
    .then(async () => {
        console.log('[Consumer] ✅ Database connected successfully.');
        const consumers = [
            new NotificationOnAttemptCreatedConsumer(queueService, notificationService),
            new NotificationOnMarketplaceRequestCreatedConsumer(queueService, notificationService, userService),
            new NotificationOnMarketplaceRequestStatusUpdatedConsumer(queueService, notificationService, userService),
            new NotificationOnWritingSessionStatusUpdatedConsumer(queueService, notificationService),
            new MessageOnMarketplaceRequestStatusUpdatedConsumer(queueService, messageService),
        ];

        await Promise.all(consumers.map(consumer => consumer.consume()));
        console.log('[Consumer] 🚀 All background workers are running and listening for jobs.');
    })
    .catch((err: Error) => {
        console.error('[Consumer] ❌ Worker startup failed:', err.message);
        process.exit(1);
    });