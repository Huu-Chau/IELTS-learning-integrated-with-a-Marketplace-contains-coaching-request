import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Database connection using config from docker-compose.yml
const sequelize = new Sequelize(
    process.env.DB_NAME || 'ielts',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '123456',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        dialect: 'postgres',
        logging: false, // Set to console.log for SQL debugging
    }
);

export default sequelize;
