import dotenv from 'dotenv';
import sequelize from './config/database';
import { KafkaService } from './services/queue/KafkaService';
import { IQueueProvider } from './services/queue/IQueueProvider';
import './models/Notification';
import { NotificationOnAttemptCreatedConsumer } from './consumers/notification-on-attempt-created';
import { INotificationService, NotificationService } from './services/notificationService';

const queueService: IQueueProvider = new KafkaService();
const notificationService: INotificationService = new NotificationService();

dotenv.config();

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
        const notificationOnAttemptCreatedConsumer = new NotificationOnAttemptCreatedConsumer(queueService, notificationService);
        await notificationOnAttemptCreatedConsumer.consume();
        console.log('[Consumer] 🚀 Background worker is running and listening for jobs.');
    })
    .catch((err: Error) => {
        console.error('[Consumer] ❌ Worker startup failed:', err.message);
        process.exit(1);
    });