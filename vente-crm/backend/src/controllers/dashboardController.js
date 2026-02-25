const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getTeamMemberIds } = require('./territoryController');

const getDashboard = async (req, res) => {
  try {
    const { User, Customer, Contract, Expense, sequelize } = req.app.locals.db;
    const userId = req.user.id;
    const role = req.user.role;

    // Zeitraum: aktueller Monat
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const contractWhere = {};
    const customerWhere = {};
    const expenseWhere = {};

    // Scope basierend auf Rolle und Gebietszugehoerigkeiten
    if (role === 'VERTRIEB') {
      contractWhere.user_id = userId;
      customerWhere.user_id = userId;
      expenseWhere.user_id = userId;
    } else if (['STANDORTLEITUNG', 'TEAMLEAD'].includes(role)) {
      // Alle Vertriebler in eigenen Gebieten finden
      const memberIds = await getTeamMemberIds(req.app.locals.db, userId, role);
      if (memberIds) {
        contractWhere.user_id = { [Op.in]: memberIds };
        customerWhere.user_id = { [Op.in]: memberIds };
        expenseWhere.user_id = { [Op.in]: memberIds };
      }
    }

    // KPIs berechnen
    const [
      totalCustomers,
      totalContracts,
      activeContracts,
      monthContracts,
      pipeline,
      monthExpenses,
      recentContracts
    ] = await Promise.all([
      // Gesamt-Kunden
      Customer.count({ where: { ...customerWhere, is_active: true } }),

      // Gesamt-Vertraege
      Contract.count({ where: contractWhere }),

      // Aktive Vertraege
      Contract.count({ where: { ...contractWhere, status: 'ACTIVE' } }),

      // Vertraege diesen Monat
      Contract.count({
        where: {
          ...contractWhere,
          created_at: { [Op.between]: [monthStart, monthEnd] }
        }
      }),

      // Pipeline nach Status
      Contract.findAll({
        where: contractWhere,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('estimated_value')), 0), 'total_value']
        ],
        group: ['status'],
        raw: true
      }),

      // Ausgaben diesen Monat
      Expense.findAll({
        where: {
          ...expenseWhere,
          expense_date: {
            [Op.between]: [
              monthStart.toISOString().split('T')[0],
              monthEnd.toISOString().split('T')[0]
            ]
          }
        },
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('deductible_amount')), 0), 'deductible']
        ],
        raw: true
      }),

      // Letzte 10 Vertraege
      Contract.findAll({
        where: contractWhere,
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['first_name', 'last_name', 'company_name']
        }],
        attributes: ['id', 'status', 'estimated_value', 'created_at']
      })
    ]);

    // Forecast berechnen
    const stageProbabilities = {
      LEAD: 0.10,
      QUALIFIED: 0.25,
      OFFER: 0.50,
      NEGOTIATION: 0.75,
      SIGNED: 0.90,
      ACTIVE: 1.00,
      CANCELLED: 0,
      EXPIRED: 0
    };

    const forecastValue = pipeline.reduce((sum, stage) => {
      const probability = stageProbabilities[stage.status] || 0;
      return sum + (parseFloat(stage.total_value) * probability);
    }, 0);

    // Conversion Rate
    const totalLeads = pipeline.reduce((sum, s) => sum + parseInt(s.count, 10), 0);
    const closedDeals = pipeline
      .filter(s => ['SIGNED', 'ACTIVE'].includes(s.status))
      .reduce((sum, s) => sum + parseInt(s.count, 10), 0);
    const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;

    // Pipeline-Objekt
    const pipelineData = {};
    pipeline.forEach(s => {
      pipelineData[s.status] = {
        count: parseInt(s.count, 10),
        value: parseFloat(s.total_value) || 0
      };
    });

    // Admin/Standortleitung: System-Metriken
    let systemMetrics = null;
    if (['ADMIN', 'STANDORTLEITUNG'].includes(role)) {
      const [totalUsers, activeUsers] = await Promise.all([
        User.count(),
        User.count({
          where: {
            is_active: true,
            last_login: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        })
      ]);
      systemMetrics = { total_users: totalUsers, active_users_24h: activeUsers };
    }

    const dashboard = {
      kpis: {
        customers: { total: totalCustomers },
        contracts: {
          total: totalContracts,
          active: activeContracts,
          this_month: monthContracts,
          conversion_rate: Math.round(conversionRate * 10) / 10
        },
        revenue: {
          forecast_value: Math.round(forecastValue * 100) / 100,
          pipeline_total: pipeline.reduce((s, p) => s + parseFloat(p.total_value || 0), 0)
        },
        expenses: {
          this_month: parseFloat(monthExpenses[0]?.total) || 0,
          deductible_this_month: parseFloat(monthExpenses[0]?.deductible) || 0
        }
      },
      pipeline: pipelineData,
      recent_contracts: recentContracts,
      system_metrics: systemMetrics
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Dashboard konnte nicht geladen werden' });
  }
};

module.exports = { getDashboard };
