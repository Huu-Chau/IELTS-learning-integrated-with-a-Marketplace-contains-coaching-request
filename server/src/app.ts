import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

// Route imports
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import attemptRoutes from './routes/attemptRoutes';
import requestRoutes from './routes/requestRoutes';
import evaluateRoutes from './routes/evaluateRoutes';

import vocabularyRoutes from './routes/vocabularyRoutes';
import cambridgeTestRoutes from './routes/cambridgeTestRoutes';
import teacherRoutes from './routes/teacherRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import notificationRoutes from './routes/notificationRoutes';
import messageRoutes from './routes/messageRoutes';
import reservationRoutes from './routes/reservationRoutes';
import { startAllJobs } from './services/cronService';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan('dev'));

console.log('[App] Middleware configured: json, cors, helmet, morgan');

// Health check
app.get('/', (req, res) => {
    console.log('[App] Health check hit');
    res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// API Routes
console.log('[App] Mounting routes...');
app.use('/api/auth', authRoutes);
console.log('[App]   ✅ /api/auth');
app.use('/api/users', userRoutes);
console.log('[App]   ✅ /api/users');
app.use('/api/attempts', attemptRoutes);
console.log('[App]   ✅ /api/attempts');
app.use('/api/requests', requestRoutes);
console.log('[App]   ✅ /api/requests');
app.use('/api/evaluate', evaluateRoutes);
console.log('[App]   ✅ /api/evaluate');

app.use('/api/vocabulary', vocabularyRoutes);
console.log('[App]   ✅ /api/vocabulary');
app.use('/api/cambridge-tests', cambridgeTestRoutes);
console.log('[App]   ✅ /api/cambridge-tests');
app.use('/api/teacher', teacherRoutes);
console.log('[App]   ✅ /api/teacher');
app.use('/api/marketplace', marketplaceRoutes);
console.log('[App]   ✅ /api/marketplace');
app.use('/api/notifications', notificationRoutes);
console.log('[App]   ✅ /api/notifications');
app.use('/api/messages', messageRoutes);
console.log('[App]   ✅ /api/messages');
app.use('/api/reservations', reservationRoutes);
console.log('[App]   ✅ /api/reservations');
console.log('[App] All routes mounted successfully');

// ── Background Jobs ───────────────────────────────────────────────────────────
// Starts all cron jobs (session reminders, auto-complete payouts, stale rejections)
startAllJobs();

export default app;
