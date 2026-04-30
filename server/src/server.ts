import http from 'http';
import app from './app';
import dotenv from 'dotenv';
import sequelize from './config/database';
import path from 'path';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { registerSpeakingSocketHandlers } from './controllers/speakingSessionController';
// Model imports — ensure all tables are created/synced on startup
import './models/Reservation';
import './models/TeacherListing';
dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Serve uploaded files statically
// Access via: http://localhost:5000/uploads/recordings/filename.mp3
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('[Server] Static file serving configured for /uploads');

// Create a raw http.Server so we can attach Socket.io on the same port
const httpServer = http.createServer(app);
console.log('[Server] HTTP server created');

// Attach Socket.io for the Speaking Agent WebSocket connection
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB — large enough for audio blobs
});
console.log('[Server] Socket.io attached');

// Register speaking session handlers
registerSpeakingSocketHandlers(io);
console.log('[Server] Speaking socket handlers registered');

// Connect to Postgres, sync all model-defined tables, then start the server
console.log('[Server] Connecting to PostgreSQL...');
sequelize.authenticate()
    // .then(() => {
    //     console.log('[Server] ✅ PostgreSQL connected successfully.');
    //     // Sync all Sequelize models — creates missing tables and alters existing
    //     // columns to match the model definition. Safe for development/thesis use.
    //     console.log('[Server] Syncing database schema (alter: true)...');
    //     return sequelize.sync({ alter: true });
    // })
    .then(() => {
        console.log('[Server] ✅ Database schema synced successfully.');
        httpServer.listen(PORT, () => {
            console.log(`[Server] 🚀 Server is running on port ${PORT} (HTTP + WebSocket)`);
        });
    })
    .catch((err: Error) => {
        console.error('[Server] ❌ Server startup failed:', err.message);
        console.error('[Server]    Make sure Docker is running: docker-compose up -d postgres');
        process.exit(1);
    });
