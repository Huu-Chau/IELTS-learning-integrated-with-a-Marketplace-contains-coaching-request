import dotenv from 'dotenv';
import sequelize from './config/database';
import { startAllJobs } from './services/cronService';

// Model imports — ensure associations and schemas are recognized
import './models/Reservation';
import './models/TeacherListing';
import './models/MarketplaceRequest';
import './models/TeacherAvailability';
import './models/Notification';
import './models/User';

dotenv.config();

console.log('[CronWorker] Starting standalone cron worker process...');

sequelize.authenticate()
    .then(() => {
        console.log('[CronWorker] ✅ Database connected successfully.');
        // Start jobs after DB connects
        startAllJobs();
        console.log('[CronWorker] 🚀 Background worker is running and listening for jobs.');
    })
    .catch((err: Error) => {
        console.error('[CronWorker] ❌ Worker startup failed:', err.message);
        process.exit(1);
    });
