const { Op } = require('sequelize');
const logger = require('../utils/logger');

const getContracts = async (req, res) => {
  try {
    const { Contract, Customer, Product, User } = req.app.locals.db;
    const { page = 1, limit = 20, status, customer_id, sort = 'created_at', order = 'DESC' } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (req.scopeUserId) where.user_id = req.scopeUserId;
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;

    const { count, rows } = await Contract.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [[sort, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'first_name', 'last_name', 'email', 'company_name'] },
        { model: Product, as: 'product', attributes: ['id', 'provider', 'tariff_name', 'category'] },
        { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    res.json({
      success: true,
      data: {
        contracts: rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get contracts error:', error);
    res.status(500).json({ success: false, error: 'Verträge konnten nicht geladen werden' });
  }
};

const getContract = async (req, res) => {
  try {
    const { Contract, Customer, Product, User, Signature } = req.app.locals.db;
    const where = { id: req.params.id };
    if (req.scopeUserId) where.user_id = req.scopeUserId;

    const contract = await Contract.findOne({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: Product, as: 'product' },
        { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: Signature, as: 'signatures', attributes: ['id', 'signed_at', 'consent_given', 'hash_value'] }
      ]
    });

    if (!contract) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    logger.error('Get contract error:', error);
    res.status(500).json({ success: false, error: 'Vertrag konnte nicht geladen werden' });
  }
};

const createContract = async (req, res) => {
  try {
    const { Contract } = req.app.locals.db;
    const contractData = {
      ...req.body,
      user_id: req.user.id,
      status_history: [{
        status: 'LEAD',
        date: new Date().toISOString(),
        user_id: req.user.id
      }]
    };

    // End-Datum berechnen
    if (contractData.start_date && contractData.duration) {
      const start = new Date(contractData.start_date);
      start.setMonth(start.getMonth() + contractData.duration);
      contractData.end_date = start.toISOString().split('T')[0];
    }

    const contract = await Contract.create(contractData);

    logger.info(`Contract created: ${contract.id} by user ${req.user.id}`);
    res.status(201).json({
      success: true,
      message: 'Vertrag erfolgreich erstellt',
      data: contract
    });
  } catch (error) {
    logger.error('Create contract error:', error);
    res.status(500).json({ success: false, error: 'Vertrag konnte nicht erstellt werden' });
  }
};

const updateContract = async (req, res) => {
  try {
    const { Contract } = req.app.locals.db;
    const where = { id: req.params.id };
    if (req.scopeUserId) where.user_id = req.scopeUserId;

    const contract = await Contract.findOne({ where });
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const updates = { ...req.body };

    // Status-History aktualisieren
    if (updates.status && updates.status !== contract.status) {
      const history = contract.status_history || [];
      history.push({
        status: updates.status,
        previous_status: contract.status,
        date: new Date().toISOString(),
        user_id: req.user.id
      });
      updates.status_history = history;
    }

    await contract.update(updates);

    res.json({
      success: true,
      message: 'Vertrag aktualisiert',
      data: contract
    });
  } catch (error) {
    logger.error('Update contract error:', error);
    res.status(500).json({ success: false, error: 'Vertrag konnte nicht aktualisiert werden' });
  }
};

const deleteContract = async (req, res) => {
  try {
    const { Contract } = req.app.locals.db;
    const contract = await Contract.findByPk(req.params.id);

    if (!contract) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    // Stornieren statt löschen (GoBD)
    const history = [...(contract.status_history || [])];
    history.push({
      status: 'CANCELLED',
      previous_status: contract.status,
      date: new Date().toISOString(),
      user_id: req.user.id,
      reason: (req.body && req.body.reason) || 'Storniert'
    });

    await contract.update({
      status: 'CANCELLED',
      status_history: history
    });

    logger.info(`Contract cancelled: ${contract.id} by user ${req.user.id}`);
    res.json({ success: true, message: 'Vertrag storniert' });
  } catch (error) {
    logger.error('Delete contract error:', error);
    res.status(500).json({ success: false, error: 'Vertrag konnte nicht storniert werden' });
  }
};

// Pipeline-Übersicht
const getPipeline = async (req, res) => {
  try {
    const { Contract } = req.app.locals.db;
    const { sequelize } = req.app.locals.db;
    const where = {};
    if (req.scopeUserId) where.user_id = req.scopeUserId;

    const pipeline = await Contract.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('estimated_value')), 'total_value']
      ],
      group: ['status']
    });

    res.json({ success: true, data: pipeline });
  } catch (error) {
    logger.error('Get pipeline error:', error);
    res.status(500).json({ success: false, error: 'Pipeline konnte nicht geladen werden' });
  }
};

module.exports = { getContracts, getContract, createContract, updateContract, deleteContract, getPipeline };
