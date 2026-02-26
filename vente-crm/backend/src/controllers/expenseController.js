const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Steuerberechnung
const calculateTax = (amount, vatRate, deductionLimit) => {
  const rate = parseFloat(vatRate) / 100;
  const netAmount = parseFloat(amount) / (1 + rate);
  const taxAmount = parseFloat(amount) - netAmount;
  let deductibleAmount = netAmount;

  if (deductionLimit) {
    deductibleAmount *= parseFloat(deductionLimit);
  }

  return {
    net_amount: Math.round(netAmount * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    deductible_amount: Math.round(deductibleAmount * 100) / 100
  };
};

const getExpenses = async (req, res) => {
  try {
    const { Expense, ExpenseCategory } = req.app.locals.db;
    const { year, month, quarter, category_id, page = 1, limit = 50 } = req.query;

    const where = {};
    const offset = (page - 1) * limit;

    // Scope: User-Filter (scopeUserIds = Array fuer Team, scopeUserId = einzelner User)
    if (req.scopeUserIds && Array.isArray(req.scopeUserIds)) {
      where.user_id = { [Op.in]: req.scopeUserIds };
    } else if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    } else if (req.query.user_id) {
      where.user_id = req.query.user_id;
    }

    // Zeitraum-Filter
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      if (month) {
        const m = String(month).padStart(2, '0');
        const lastDay = new Date(year, month, 0).getDate();
        where.expense_date = {
          [Op.between]: [`${year}-${m}-01`, `${year}-${m}-${lastDay}`]
        };
      } else if (quarter) {
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        const lastDay = new Date(year, endMonth, 0).getDate();
        where.expense_date = {
          [Op.between]: [
            `${year}-${String(startMonth).padStart(2, '0')}-01`,
            `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`
          ]
        };
      } else {
        where.expense_date = { [Op.between]: [startDate, endDate] };
      }
    }

    if (category_id) where.category_id = category_id;

    const { count, rows } = await Expense.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['expense_date', 'DESC']],
      include: [{
        model: ExpenseCategory,
        as: 'category',
        attributes: ['id', 'code', 'name', 'vat_rate', 'tax_deductible']
      }]
    });

    // Summen berechnen
    const totals = rows.reduce((acc, exp) => {
      acc.total_amount += parseFloat(exp.amount) || 0;
      acc.total_net += parseFloat(exp.net_amount) || 0;
      acc.total_tax += parseFloat(exp.tax_amount) || 0;
      acc.total_deductible += parseFloat(exp.deductible_amount) || 0;
      return acc;
    }, { total_amount: 0, total_net: 0, total_tax: 0, total_deductible: 0 });

    res.json({
      success: true,
      data: {
        expenses: rows,
        totals,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get expenses error:', error);
    res.status(500).json({ success: false, error: 'Ausgaben konnten nicht geladen werden' });
  }
};

const createExpense = async (req, res) => {
  try {
    const { Expense, ExpenseCategory } = req.app.locals.db;

    const category = await ExpenseCategory.findByPk(req.body.category_id);
    if (!category) {
      return res.status(400).json({ success: false, error: 'Ungültige Kategorie' });
    }

    // Steuer berechnen
    const taxCalc = calculateTax(req.body.amount, category.vat_rate, category.deduction_limit);

    const expense = await Expense.create({
      ...req.body,
      user_id: req.user.id,
      net_amount: taxCalc.net_amount,
      tax_amount: taxCalc.tax_amount,
      deductible_amount: taxCalc.deductible_amount
    });

    const expenseWithCategory = await Expense.findByPk(expense.id, {
      include: [{ model: ExpenseCategory, as: 'category' }]
    });

    logger.info(`Expense created: ${expense.id} by user ${req.user.id}`);
    res.status(201).json({
      success: true,
      message: 'Ausgabe erfolgreich erfasst',
      data: expenseWithCategory
    });
  } catch (error) {
    logger.error('Create expense error:', error);
    res.status(500).json({ success: false, error: 'Ausgabe konnte nicht erstellt werden' });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { Expense, ExpenseCategory } = req.app.locals.db;
    const where = { id: req.params.id };
    if (req.scopeUserId) where.user_id = req.scopeUserId;

    const expense = await Expense.findOne({ where });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }

    const updates = { ...req.body };

    // Neu berechnen wenn Betrag oder Kategorie geändert
    if (updates.amount || updates.category_id) {
      const catId = updates.category_id || expense.category_id;
      const category = await ExpenseCategory.findByPk(catId);
      const amount = updates.amount || expense.amount;
      const taxCalc = calculateTax(amount, category.vat_rate, category.deduction_limit);
      Object.assign(updates, taxCalc);
    }

    await expense.update(updates);
    res.json({ success: true, message: 'Ausgabe aktualisiert', data: expense });
  } catch (error) {
    logger.error('Update expense error:', error);
    res.status(500).json({ success: false, error: 'Ausgabe konnte nicht aktualisiert werden' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { Expense } = req.app.locals.db;
    const where = { id: req.params.id };
    if (req.scopeUserId) where.user_id = req.scopeUserId;

    const expense = await Expense.findOne({ where });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }

    await expense.destroy();
    logger.info(`Expense deleted: ${req.params.id} by user ${req.user.id}`);
    res.json({ success: true, message: 'Ausgabe gelöscht' });
  } catch (error) {
    logger.error('Delete expense error:', error);
    res.status(500).json({ success: false, error: 'Ausgabe konnte nicht gelöscht werden' });
  }
};

const getCategories = async (req, res) => {
  try {
    const { ExpenseCategory } = req.app.locals.db;
    const categories = await ExpenseCategory.findAll({
      order: [['code', 'ASC']]
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Kategorien konnten nicht geladen werden' });
  }
};

const exportExpenses = async (req, res) => {
  try {
    const { Expense, ExpenseCategory, User } = req.app.locals.db;
    const { year, quarter, format = 'json' } = req.query;

    const where = {};
    if (req.scopeUserIds && Array.isArray(req.scopeUserIds)) {
      where.user_id = { [Op.in]: req.scopeUserIds };
    } else if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    } else if (req.query.user_id) {
      where.user_id = req.query.user_id;
    }

    if (year) {
      if (quarter) {
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        const lastDay = new Date(year, endMonth, 0).getDate();
        where.expense_date = {
          [Op.between]: [
            `${year}-${String(startMonth).padStart(2, '0')}-01`,
            `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`
          ]
        };
      } else {
        where.expense_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
      }
    }

    const expenses = await Expense.findAll({
      where,
      order: [['expense_date', 'ASC']],
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'email', 'company_name'] }
      ]
    });

    if (format === 'json') {
      const totals = expenses.reduce((acc, exp) => {
        acc.total_amount += parseFloat(exp.amount) || 0;
        acc.total_net += parseFloat(exp.net_amount) || 0;
        acc.total_tax += parseFloat(exp.tax_amount) || 0;
        acc.total_deductible += parseFloat(exp.deductible_amount) || 0;
        return acc;
      }, { total_amount: 0, total_net: 0, total_tax: 0, total_deductible: 0 });

      return res.json({
        success: true,
        data: {
          period: { year, quarter: quarter || 'all' },
          expenses,
          totals
        }
      });
    }

    // Excel-Export (XLSX)
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();

    const wsData = [
      ['Datum', 'Beschreibung', 'Kategorie', 'SKR-Konto', 'Netto', 'USt', 'Brutto', 'Absetzbar']
    ];

    expenses.forEach(exp => {
      wsData.push([
        exp.expense_date,
        exp.description,
        exp.category ? exp.category.name : '',
        exp.category ? exp.category.code : '',
        parseFloat(exp.net_amount) || 0,
        parseFloat(exp.tax_amount) || 0,
        parseFloat(exp.amount) || 0,
        parseFloat(exp.deductible_amount) || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'EÜR');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=EUR_${year || 'all'}_Q${quarter || 'all'}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export expenses error:', error);
    res.status(500).json({ success: false, error: 'Export fehlgeschlagen' });
  }
};

const uploadReceipt = async (req, res) => {
  try {
    const { Expense } = req.app.locals.db;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
    }

    const where = { id: req.params.id };
    if (req.scopeUserIds && Array.isArray(req.scopeUserIds)) {
      where.user_id = { [Op.in]: req.scopeUserIds };
    } else if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    }

    const expense = await Expense.findOne({ where });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Ausgabe nicht gefunden' });
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`;
    await expense.update({ receipt_url: receiptUrl });

    logger.info(`Receipt uploaded for expense ${expense.id} by user ${req.user.id}`);
    res.json({
      success: true,
      message: 'Beleg erfolgreich hochgeladen',
      data: { receipt_url: receiptUrl }
    });
  } catch (error) {
    logger.error('Upload receipt error:', error);
    res.status(500).json({ success: false, error: 'Beleg konnte nicht hochgeladen werden' });
  }
};

module.exports = {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getCategories, exportExpenses, uploadReceipt
};
