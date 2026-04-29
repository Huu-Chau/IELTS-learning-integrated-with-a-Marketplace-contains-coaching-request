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

        // ── Connection Pool ──────────────────────────────────────────────────
        // Default pool size is 5 — far too small when cron jobs + concurrent
        // API requests compete for connections simultaneously.
        pool: {
            max: 20,       // Maximum connections in the pool
            min: 2,        // Keep at least 2 warm connections alive
            acquire: 30000, // Max ms to wait for a connection before throwing (30s)
            idle: 10000,   // Release a connection after 10s of inactivity
        },

        // ── Per-query Statement Timeout ──────────────────────────────────────
        // PostgreSQL kills any single query that runs longer than 25 seconds.
        // This prevents stuck transactions from holding connections indefinitely
        // and blocking the pool for other operations like login.
        dialectOptions: {
            statement_timeout: 25000, // 25 seconds — kills runaway queries at DB level
        },
    }
);

export default sequelize;
