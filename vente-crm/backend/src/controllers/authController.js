const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getPermissionsForRole } = require('../middleware/rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: getPermissionsForRole(user.role)
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'vente-crm'
  });

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN, issuer: 'vente-crm' }
  );

  return { token, refreshToken };
};

const register = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const {
      email, password, company_name, legal_form,
      owner_manager, tax_number, street, postal_code, city, iban,
      first_name, last_name, phone
    } = req.body;

    // Prüfe ob E-Mail bereits existiert
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'E-Mail-Adresse bereits registriert'
      });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 30 Tage kostenlose Testphase
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const user = await User.create({
      email,
      password_hash,
      role: 'VERTRIEB',
      company_name,
      legal_form,
      owner_manager,
      tax_number,
      street,
      postal_code,
      city,
      iban,
      first_name,
      last_name,
      phone,
      trial_ends_at: trialEndsAt,
      subscription_status: 'TRIAL'
    });

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registrierung fehlgeschlagen'
    });
  }
};

const login = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Ungültige Anmeldedaten'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Ungültige Anmeldedaten'
      });
    }

    const { token, refreshToken } = generateTokens(user);

    // Refresh-Token und Last-Login speichern
    await user.update({
      refresh_token: refreshToken,
      last_login: new Date()
    });

    logger.info(`User logged in: ${email}`);

    // Subscription-Status berechnen
    const now = new Date();
    const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const isTrialActive = user.subscription_status === 'TRIAL' && trialEndsAt && trialEndsAt > now;
    const isSubscriptionActive = user.subscription_status === 'ACTIVE';
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))) : 0;

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        ...user.toJSON(),
        permissions: getPermissionsForRole(user.role),
        subscription: {
          status: user.subscription_status,
          trial_ends_at: user.trial_ends_at,
          trial_days_left: trialDaysLeft,
          has_access: isTrialActive || isSubscriptionActive
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Anmeldung fehlgeschlagen'
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh-Token erforderlich'
      });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const user = await User.findOne({
      where: { id: decoded.id, refresh_token: token, is_active: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Ungültiger Refresh-Token'
      });
    }

    const tokens = generateTokens(user);
    await user.update({ refresh_token: tokens.refreshToken });

    res.json({
      success: true,
      token: tokens.token,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Ungültiger oder abgelaufener Refresh-Token'
    });
  }
};

const logout = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    await User.update(
      { refresh_token: null },
      { where: { id: req.user.id } }
    );

    res.json({ success: true, message: 'Erfolgreich abgemeldet' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Abmeldung fehlgeschlagen' });
  }
};

const getProfile = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    res.json({
      success: true,
      user: {
        ...user.toJSON(),
        permissions: getPermissionsForRole(user.role)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Profil konnte nicht geladen werden' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const allowedFields = [
      'first_name', 'last_name', 'company_name', 'legal_form',
      'owner_manager', 'tax_number', 'street', 'postal_code',
      'city', 'phone', 'iban'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Passwort-Änderung
    if (req.body.password && req.body.current_password) {
      const isValid = await bcrypt.compare(req.body.current_password, user.password_hash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Aktuelles Passwort ist falsch'
        });
      }
      updates.password_hash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
    }

    await user.update(updates);

    res.json({
      success: true,
      message: 'Profil aktualisiert',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Profil konnte nicht aktualisiert werden' });
  }
};

module.exports = {
  register, login, refreshToken, logout, getProfile, updateProfile
};
