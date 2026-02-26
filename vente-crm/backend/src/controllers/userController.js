const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

const getUsers = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const { role, is_active = 'true', search } = req.query;
    const { Op } = require('sequelize');

    const where = {};
    if (role) where.role = role;
    if (is_active !== 'all') where.is_active = is_active === 'true';

    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash', 'refresh_token'] }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Benutzer konnten nicht geladen werden' });
  }
};

const getUser = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'refresh_token'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Benutzer konnte nicht geladen werden' });
  }
};

const createUser = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const { email, password, role, first_name, last_name, company_name, phone } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'E-Mail bereits vergeben' });
    }

    const password_hash = await bcrypt.hash(password || 'Temp1234!', BCRYPT_ROUNDS);

    // 30 Tage kostenlose Testphase
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const user = await User.create({
      email, password_hash, role: role || 'VERTRIEB',
      first_name, last_name, company_name, phone,
      trial_ends_at: trialEndsAt,
      subscription_status: 'TRIAL'
    });

    logger.info(`User created: ${user.id} by admin ${req.user.id}`);
    res.status(201).json({
      success: true,
      message: 'Benutzer erstellt',
      data: user.toJSON()
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Benutzer konnte nicht erstellt werden' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const allowedFields = [
      'role', 'first_name', 'last_name', 'company_name',
      'phone', 'is_active', 'street', 'postal_code', 'city'
    ];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (req.body.password) {
      updates.password_hash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
    }

    await user.update(updates);

    logger.info(`User updated: ${user.id} by admin ${req.user.id}`);
    res.json({ success: true, message: 'Benutzer aktualisiert', data: user.toJSON() });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Benutzer konnte nicht aktualisiert werden' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Sie können sich nicht selbst deaktivieren' });
    }

    await user.update({ is_active: false });

    logger.info(`User deactivated: ${user.id} by admin ${req.user.id}`);
    res.json({ success: true, message: 'Benutzer deaktiviert' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Benutzer konnte nicht deaktiviert werden' });
  }
};

// Eigene Position aktualisieren (fuer alle eingeloggten User)
const updateLocation = async (req, res) => {
  try {
    const { User, LocationPing, TerritoryRun, RunTerritory } = req.app.locals.db;
    const { Op } = require('sequelize');
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude und Longitude erforderlich' });
    }

    // is_in_area berechnen
    let isInArea = false;
    let activeRunId = null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const activeRuns = await TerritoryRun.findAll({
        where: {
          status: 'active',
          valid_from: { [Op.lte]: today },
          valid_until: { [Op.gte]: today }
        },
        raw: true
      });

      // Finde Run wo User Rep ist
      for (const run of activeRuns) {
        const ids = run.rep_ids ? run.rep_ids.split(',').map(s => parseInt(s.trim(), 10)) : [];
        if (ids.includes(req.user.id)) {
          activeRunId = run.id;
          break;
        }
      }

      if (activeRunId) {
        const territory = await RunTerritory.findOne({
          where: { run_id: activeRunId, rep_user_id: req.user.id },
          attributes: ['polygon_json'],
          raw: true
        });

        if (territory && territory.polygon_json) {
          try {
            const { isPointInPolygon } = require('../services/territoryAssigner');
            isInArea = isPointInPolygon(latitude, longitude, territory.polygon_json);
          } catch { /* turf nicht verfuegbar -> false */ }
        }
      }
    } catch (err) {
      logger.warn('is_in_area check failed:', err.message);
    }

    // User aktualisieren
    await User.update(
      {
        last_latitude: latitude,
        last_longitude: longitude,
        last_location_at: new Date(),
        is_in_area: isInArea,
        current_run_id: activeRunId
      },
      { where: { id: req.user.id } }
    );

    // Location Ping speichern (fire and forget)
    try {
      await LocationPing.create({
        user_id: req.user.id,
        run_id: activeRunId,
        latitude,
        longitude,
        accuracy_m: accuracy || null,
        speed_mps: speed || null,
        heading_deg: heading || null,
        is_in_area: isInArea
      });
    } catch (err) {
      logger.warn('Location ping save failed:', err.message);
    }

    res.json({ success: true, data: { is_in_area: isInArea } });
  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({ success: false, error: 'Position konnte nicht aktualisiert werden' });
  }
};

// Alle aktiven Mitarbeiter mit Position (fuer Admin/Standortleitung)
const getTeamLocations = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const { Op } = require('sequelize');

    // Alle aktiven User mit bekannter Position anzeigen (nicht nur letzte 10 Min)
    const users = await User.findAll({
      where: {
        is_active: true,
        last_latitude: { [Op.ne]: null },
        last_longitude: { [Op.ne]: null }
      },
      attributes: ['id', 'first_name', 'last_name', 'role', 'email', 'phone',
                    'last_latitude', 'last_longitude', 'last_location_at',
                    'is_in_area', 'current_run_id']
    });

    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get team locations error:', error);
    res.status(500).json({ success: false, error: 'Team-Positionen konnten nicht geladen werden' });
  }
};

// Signierte Vertraege mit GPS-Standorten (fuer TeamMap)
const getSignedContractLocations = async (req, res) => {
  try {
    const { Signature, Contract, Customer, User } = req.app.locals.db;
    const { Op } = require('sequelize');

    const signatures = await Signature.findAll({
      where: {
        gps_latitude: { [Op.ne]: null },
        gps_longitude: { [Op.ne]: null }
      },
      include: [
        {
          model: Contract, as: 'contract',
          attributes: ['id', 'status', 'estimated_value'],
          where: { status: { [Op.in]: ['SIGNED', 'ACTIVE'] } },
          include: [
            { model: Customer, as: 'customer', attributes: ['id', 'first_name', 'last_name', 'company_name'] }
          ]
        },
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }
      ],
      attributes: ['id', 'gps_latitude', 'gps_longitude', 'signed_at'],
      order: [['signed_at', 'DESC']],
      limit: 200
    });

    res.json({ success: true, data: signatures });
  } catch (error) {
    logger.error('Get signed contract locations error:', error);
    res.status(500).json({ success: false, error: 'Vertragsstandorte konnten nicht geladen werden' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, updateLocation, getTeamLocations, getSignedContractLocations };
