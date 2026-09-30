import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { auditLogger } from './middleware/audit.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import driverRoutes from './routes/driver.routes';
import vehicleRoutes from './routes/vehicle.routes';
import routeRoutes from './routes/route.routes';
import pickupPointRoutes from './routes/pickupPoint.routes';
import reservationRoutes from './routes/reservation.routes';
import ticketRoutes from './routes/ticket.routes';
import tripRoutes from './routes/trip.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import trackingRoutes from './routes/tracking.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed =
      config.allowedOrigins.includes(origin) ||
      config.allowedOrigins.includes('*') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Dedicated high-throughput limiter for active real-time GPS tracking
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1800, // Up to 2 updates/sec per driver
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Tracking rate limit exceeded, please slow down' },
});
app.use('/api/tracking/:tripId/location', trackingLimiter);

// Global limiter for standard API routes (excludes high-throughput tracking and health endpoints)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.includes('/tracking/') || req.originalUrl === '/api/health',
  message: { message: 'Too many requests, please try again later' },
});
app.use('/api', globalLimiter);

app.use(auditLogger);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Smart Shuttle API Docs',
}));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/pickup-points', pickupPointRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
