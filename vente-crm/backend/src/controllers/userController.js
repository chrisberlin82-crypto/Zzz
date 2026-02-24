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

    const user = await User.create({
      email, password_hash, role: role || 'VERTRIEB',
      first_name, last_name, company_name, phone
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
    const { User } = req.app.locals.db;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude und Longitude erforderlich' });
    }

    await User.update(
      { last_latitude: latitude, last_longitude: longitude, last_location_at: new Date() },
      { where: { id: req.user.id } }
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({ success: false, error: 'Position konnte nicht aktualisiert werden' });
  }
};

// Alle aktiven Vertriebler mit Position (fuer Admin/Standortleitung)
const getTeamLocations = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const { Op } = require('sequelize');

    // Nur User die in den letzten 10 Minuten Position gesendet haben
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const users = await User.findAll({
      where: {
        is_active: true,
        last_latitude: { [Op.ne]: null },
        last_longitude: { [Op.ne]: null },
        last_location_at: { [Op.gte]: tenMinutesAgo }
      },
      attributes: ['id', 'first_name', 'last_name', 'role', 'email', 'phone',
                    'last_latitude', 'last_longitude', 'last_location_at']
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
