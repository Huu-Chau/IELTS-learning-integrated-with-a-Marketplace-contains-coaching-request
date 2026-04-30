import sequelize from '../config/database';
import TeacherAvailability from '../models/TeacherAvailability';
import MarketplaceRequest from '../models/MarketplaceRequest';

async function syncModels() {
    try {
        console.log('Syncing TeacherAvailability and MarketplaceRequest...');
        await TeacherAvailability.sync({ alter: true });
        await MarketplaceRequest.sync({ alter: true });
        console.log('Sync complete!');
        process.exit(0);
    } catch (e) {
        console.error('Failed to sync:', e);
        process.exit(1);
    }
}

syncModels();
