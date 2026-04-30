import sequelize from '../config/database';
import User from '../models/User';
import TeacherListing from '../models/TeacherListing';
import MarketplaceRequest from '../models/MarketplaceRequest';

async function migrateCurrency() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        
        console.log('Dividing Users.wallet_balance by 1000...');
        await sequelize.query('UPDATE "Users" SET wallet_balance = wallet_balance / 1000;');
        
        console.log('Dividing TeacherListings.pricePerHour by 1000...');
        await sequelize.query('UPDATE "TeacherListings" SET "pricePerHour" = "pricePerHour" / 1000;');
        
        console.log('Dividing MarketplaceRequests.fee by 1000...');
        await sequelize.query('UPDATE "MarketplaceRequests" SET fee = fee / 1000;');
        
        console.log('Currency migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateCurrency();
