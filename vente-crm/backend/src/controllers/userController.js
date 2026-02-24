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

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
