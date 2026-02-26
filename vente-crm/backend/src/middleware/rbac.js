/**
 * Rollenbasierte Zugriffskontrolle (RBAC)
 * Hierarchie: ADMIN > STANDORTLEITUNG > TEAMLEAD > BACKOFFICE > VERTRIEB
 */

const ROLE_HIERARCHY = {
  ADMIN: 5,
  STANDORTLEITUNG: 4,
  TEAMLEAD: 3,
  BACKOFFICE: 2,
  VERTRIEB: 1
};

// Berechtigungen pro Rolle
const ROLE_PERMISSIONS = {
  ADMIN: [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'contracts:read', 'contracts:create', 'contracts:update', 'contracts:delete',
    'contracts:approve', 'contracts:cancel',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete', 'expenses:export',
    'expenses:read_all',
    'addresses:read', 'addresses:create', 'addresses:update', 'addresses:delete',
    'addresses:read_all', 'addresses:import',
    'territories:read', 'territories:create', 'territories:update', 'territories:delete',
    'territories:assign', 'territories:read_own',
    'signatures:read', 'signatures:create',
    'audit:read',
    'dashboard:read', 'dashboard:read_all',
    'settings:read', 'settings:update',
    'reports:read', 'reports:export'
  ],
  STANDORTLEITUNG: [
    'users:read', 'users:create', 'users:update',
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'contracts:read', 'contracts:create', 'contracts:update',
    'contracts:approve', 'contracts:cancel',
    'products:read',
    'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete', 'expenses:export',
    'expenses:read_all',
    'addresses:read', 'addresses:create', 'addresses:update', 'addresses:delete',
    'addresses:read_all', 'addresses:import',
    'territories:read', 'territories:assign', 'territories:read_own',
    'signatures:read', 'signatures:create',
    'audit:read',
    'dashboard:read', 'dashboard:read_all',
    'reports:read', 'reports:export'
  ],
  TEAMLEAD: [
    'users:read',
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'contracts:read', 'contracts:create', 'contracts:update',
    'contracts:approve', 'contracts:cancel',
    'products:read',
    'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete', 'expenses:export',
    'expenses:read_all',
    'addresses:read', 'addresses:create', 'addresses:update', 'addresses:delete',
    'addresses:read_all', 'addresses:import',
    'territories:read', 'territories:assign', 'territories:read_own',
    'signatures:read', 'signatures:create',
    'dashboard:read', 'dashboard:read_all',
    'reports:read'
  ],
  BACKOFFICE: [
    'customers:read', 'customers:create', 'customers:update',
    'contracts:read', 'contracts:create', 'contracts:update',
    'products:read',
    'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete', 'expenses:export',
    'addresses:read',
    'signatures:read',
    'dashboard:read',
    'reports:read'
  ],
  VERTRIEB: [
    'customers:read', 'customers:create', 'customers:update',
    'contracts:read', 'contracts:create', 'contracts:update',
    'products:read',
    'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete', 'expenses:export',
    'addresses:read', 'addresses:create', 'addresses:update', 'addresses:import',
    'territories:read_own',
    'signatures:read', 'signatures:create',
    'dashboard:read'
  ]
};

/**
 * Prüft ob der Benutzer die erforderliche Berechtigung hat
 */
const checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Authentifizierung erforderlich'
      });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = requiredPermissions.some(perm =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Unzureichende Berechtigungen'
      });
    }

    next();
  };
};

/**
 * Prüft ob der Benutzer eine Mindestrolle hat
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Authentifizierung erforderlich'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unzureichende Berechtigungen'
      });
    }

    next();
  };
};

/**
 * Prüft ob der Benutzer mindestens die angegebene Hierarchie-Stufe hat
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Authentifizierung erforderlich'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: 'Unzureichende Berechtigungen'
      });
    }

    next();
  };
};

/**
 * Filtert Daten basierend auf Rolle und Gebietszugehoerigkeiten
 * VERTRIEB/BACKOFFICE: nur eigene Daten
 * STANDORTLEITUNG/TEAMLEAD: eigene + Daten der Vertriebler in eigenen Gebieten
 * ADMIN: alle Daten
 */
const scopeToUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentifizierung erforderlich' });
  }

  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;

  // VERTRIEB/BACKOFFICE sieht nur eigene Daten
  if (userLevel <= 2) {
    req.scopeUserId = req.user.id;
  }
  // STANDORTLEITUNG/TEAMLEAD: eigene + Gebiets-Mitglieder
  else if (['STANDORTLEITUNG', 'TEAMLEAD'].includes(req.user.role)) {
    try {
      const { getTeamMemberIds } = require('../controllers/territoryController');
      const memberIds = await getTeamMemberIds(req.app.locals.db, req.user.id, req.user.role);
      if (memberIds) {
        req.scopeUserIds = memberIds; // Array von IDs
        req.scopeUserId = memberIds;  // Auch als einzelner Wert fuer abwaertskompatibilitaet
      }
    } catch (err) {
      req.scopeUserId = req.user.id;
    }
  }
  // ADMIN: kein Filter

  next();
};

const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  checkPermission,
  requireRole,
  requireMinRole,
  scopeToUser,
  getPermissionsForRole,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
};
