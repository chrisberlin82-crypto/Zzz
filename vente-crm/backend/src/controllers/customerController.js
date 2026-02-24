const { Op } = require('sequelize');
const logger = require('../utils/logger');

const getCustomers = async (req, res) => {
  try {
    const { Customer, Contract } = req.app.locals.db;
    const {
      page = 1, limit = 20, search, type, source, sort = 'created_at', order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Scope: VERTRIEB sieht nur eigene Kunden
    if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    }

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (type) where.type = type;
    if (source) where.source = source;

    where.is_active = true;

    const allowedSortFields = ['created_at', 'last_name', 'first_name', 'email', 'city'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortField, sortOrder]],
      include: [{
        model: Contract,
        as: 'contracts',
        attributes: ['id', 'status', 'estimated_value'],
        required: false
      }]
    });

    const customers = rows.map(c => {
      const json = c.toJSON();
      json.contracts_count = json.contracts ? json.contracts.length : 0;
      json.total_value = json.contracts
        ? json.contracts.reduce((sum, ct) => sum + (parseFloat(ct.estimated_value) || 0), 0)
        : 0;
      delete json.contracts;
      return json;
    });

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ success: false, error: 'Kunden konnten nicht geladen werden' });
  }
};

const getCustomer = async (req, res) => {
  try {
    const { Customer, Contract, User } = req.app.locals.db;
    const where = { id: req.params.id };

    if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    }

    const customer = await Customer.findOne({
      where,
      include: [
        { model: Contract, as: 'contracts' },
        { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Kunde nicht gefunden' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    logger.error('Get customer error:', error);
    res.status(500).json({ success: false, error: 'Kunde konnte nicht geladen werden' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { Customer } = req.app.locals.db;

    // Convert empty strings to null for optional fields
    // (Sequelize validators like isEmail reject empty strings)
    const optionalStringFields = [
      'email', 'phone', 'company_name', 'street', 'postal_code', 'city', 'notes'
    ];
    const body = { ...req.body };
    optionalStringFields.forEach(field => {
      if (body[field] !== undefined && body[field].toString().trim() === '') {
        body[field] = null;
      }
    });

    const customerData = {
      ...body,
      user_id: req.user.id,
      gdpr_consent_date: req.body.gdpr_consent ? new Date() : null
    };

    const customer = await Customer.create(customerData);

    logger.info(`Customer created: ${customer.id} by user ${req.user.id}`);
    res.status(201).json({
      success: true,
      message: 'Kunde erfolgreich erstellt',
      data: customer
    });
  } catch (error) {
    logger.error('Create customer error:', error);
    res.status(500).json({ success: false, error: 'Kunde konnte nicht erstellt werden' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { Customer } = req.app.locals.db;
    const where = { id: req.params.id };

    if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    }

    const customer = await Customer.findOne({ where });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Kunde nicht gefunden' });
    }

    const allowedFields = [
      'type', 'first_name', 'last_name', 'company_name', 'email',
      'phone', 'street', 'postal_code', 'city', 'source', 'needs', 'notes',
      'gdpr_consent'
    ];

    const optionalStringFields = [
      'email', 'phone', 'company_name', 'street', 'postal_code', 'city', 'notes'
    ];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = optionalStringFields.includes(field) && req.body[field].toString().trim() === ''
          ? null : req.body[field];
      }
    });

    if (updates.gdpr_consent && !customer.gdpr_consent) {
      updates.gdpr_consent_date = new Date();
    }

    await customer.update(updates);

    res.json({
      success: true,
      message: 'Kunde aktualisiert',
      data: customer
    });
  } catch (error) {
    logger.error('Update customer error:', error);
    res.status(500).json({ success: false, error: 'Kunde konnte nicht aktualisiert werden' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { Customer } = req.app.locals.db;
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Kunde nicht gefunden' });
    }

    // Soft Delete
    await customer.update({ is_active: false });

    logger.info(`Customer deleted (soft): ${customer.id} by user ${req.user.id}`);
    res.json({ success: true, message: 'Kunde gelöscht' });
  } catch (error) {
    logger.error('Delete customer error:', error);
    res.status(500).json({ success: false, error: 'Kunde konnte nicht gelöscht werden' });
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
