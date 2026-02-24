require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const responseTime = require('response-time');
const path = require('path');
const logger = require('./utils/logger');
const db = require('./models');
const { connectRedis } = require('./config/redis');
const { auditMiddleware } = require('./middleware/audit');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for Docker/Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS - In production via nginx, all requests come from same origin
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response time tracking
app.use(responseTime((req, res, time) => {
  if (time > 1000) {
    logger.warn(`Slow request: ${req.method} ${req.url} - ${Math.round(time)}ms`);
  }
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: { success: false, error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', generalLimiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT, 10) || 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Zu viele Login-Versuche. Bitte warten.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Make DB available to controllers
app.locals.db = db;

// Audit middleware (GoBD)
app.use('/api/', auditMiddleware);

// Routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const contractRoutes = require('./routes/contracts');
const productRoutes = require('./routes/products');
const expenseRoutes = require('./routes/expenses');
const addressRoutes = require('./routes/addresses');
const signatureRoutes = require('./routes/signatures');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/address-lists', addressRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {}
  };

  // DB check
  try {
    await db.sequelize.authenticate();
    health.services.database = 'connected';
  } catch (e) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // Redis check
  try {
    const { getRedisClient } = require('./config/redis');
    const redis = getRedisClient();
    if (redis && redis.isOpen) {
      await redis.ping();
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'disconnected';
    }
  } catch (e) {
    health.services.redis = 'disconnected';
  }

  // Always return 200 for Docker health check - detailed status is in the body
  res.status(200).json(health);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpunkt nicht gefunden' });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validierungsfehler',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Datensatz existiert bereits'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Anfrage zu groß'
    });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Interner Serverfehler'
      : err.message
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await db.sequelize.authenticate();
    logger.info('Datenbankverbindung hergestellt');

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      logger.info('Datenbankmodelle synchronisiert');
    }

    // Connect to Redis (non-blocking - server starts even if Redis is unavailable)
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis nicht verfuegbar, Server startet ohne Redis:', redisError.message);
    }

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Vente CRM Backend gestartet auf Port ${PORT}`);
      logger.info(`Umgebung: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Server konnte nicht gestartet werden:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
