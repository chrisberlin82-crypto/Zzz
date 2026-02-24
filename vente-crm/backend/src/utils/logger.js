const winston = require('winston');
const path = require('path');

const logDir = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : '/app/logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.LOG_FORMAT === 'json'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
        })
  ),
  defaultMeta: { service: 'vente-crm' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// File transports only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  try {
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5
    }));
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 14
    }));
  } catch (e) {
    // Log directory may not exist in dev
  }
}

// Audit logger for GoBD compliance
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'vente-crm-audit' },
  transports: [
    new winston.transports.Console({ level: 'warn' })
  ]
});

if (process.env.NODE_ENV !== 'test' && process.env.AUDIT_LOG_ENABLED === 'true') {
  try {
    auditLogger.add(new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: 50 * 1024 * 1024,
      maxFiles: 365
    }));
  } catch (e) {
    // Log directory may not exist
  }
}

module.exports = logger;
module.exports.auditLogger = auditLogger;
