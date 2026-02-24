const { auditLogger } = require('../utils/logger');

/**
 * Audit-Middleware fuer GoBD-konforme Protokollierung
 */
const auditMiddleware = (req, res, next) => {
  // Nur schreibende Operationen protokollieren
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const originalSend = res.send;

  res.send = function (data) {
    const entityType = req.baseUrl.split('/').pop() || 'unknown';
    const entityId = req.params.id || null;

    const auditEntry = {
      entity_type: entityType,
      entity_id: entityId,
      action: req.method,
      user_id: req.user ? req.user.id : null,
      user_email: req.user ? req.user.email : null,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    };

    // Request-Daten protokollieren (ohne sensible Felder)
    if (req.body) {
      const sanitizedBody = { ...req.body };
      delete sanitizedBody.password;
      delete sanitizedBody.password_hash;
      delete sanitizedBody.signature_data;
      delete sanitizedBody.pngBase64;
      auditEntry.request_data = sanitizedBody;
    }

    auditLogger.info('audit', auditEntry);

    // In DB speichern (async, blockiert nicht)
    if (req.app.locals.db && req.app.locals.db.AuditLog) {
      req.app.locals.db.AuditLog.create({
        entity_type: entityType,
        entity_id: entityId ? parseInt(entityId, 10) : null,
        user_id: req.user ? req.user.id : null,
        action: req.method,
        after_data: req.body ? auditEntry.request_data : null,
        ip_address: auditEntry.ip_address,
        user_agent: auditEntry.user_agent
      }).catch(() => {
        // Audit-Log-Fehler sollen den Request nicht blockieren
      });
    }

    originalSend.call(this, data);
  };

  next();
};

module.exports = { auditMiddleware };
