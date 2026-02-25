const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Helper: Team-Mitglieder-IDs ermitteln (mit Fallback)
const safeGetTeamMemberIds = async (db, userId, userRole) => {
  try {
    const { TerritoryAssignment, SalespersonTerritory } = db;
    if (!TerritoryAssignment || !SalespersonTerritory) return [userId];

    if (userRole === 'ADMIN') return null;
    if (userRole === 'VERTRIEB') return [userId];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const assignments = await TerritoryAssignment.findAll({
      where: {
        assigned_to_user_id: userId,
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today }
      },
      attributes: ['id']
    });

    if (assignments.length === 0) return [userId];

    const assignmentIds = assignments.map(a => a.id);
    const spTerritories = await SalespersonTerritory.findAll({
      where: {
        territory_assignment_id: { [Op.in]: assignmentIds },
        is_active: true
      },
      attributes: ['salesperson_user_id']
    });

    return [...new Set([userId, ...spTerritories.map(sp => sp.salesperson_user_id)])];
  } catch (err) {
    logger.warn('getTeamMemberIds Fehler (Fallback auf eigene ID):', err.message);
    return [userId];
  }
};

// Helper: Einzelne Query sicher ausfuehren
const safeQuery = async (label, queryFn, fallback) => {
  try {
    return await queryFn();
  } catch (err) {
    logger.warn(`Dashboard Query "${label}" fehlgeschlagen:`, err.message);
    return fallback;
  }
};

const getDashboard = async (req, res) => {
  try {
    const { User, Customer, Contract, Expense, Product, sequelize } = req.app.locals.db;
    const userId = req.user.id;
    const role = req.user.role;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const contractWhere = {};
    const customerWhere = {};
    const expenseWhere = {};

    // Scope basierend auf Rolle
    if (role === 'VERTRIEB' || role === 'BACKOFFICE') {
      contractWhere.user_id = userId;
      customerWhere.user_id = userId;
      expenseWhere.user_id = userId;
    } else if (['STANDORTLEITUNG', 'TEAMLEAD'].includes(role)) {
      const memberIds = await safeGetTeamMemberIds(req.app.locals.db, userId, role);
      if (memberIds) {
        contractWhere.user_id = { [Op.in]: memberIds };
        customerWhere.user_id = { [Op.in]: memberIds };
        expenseWhere.user_id = { [Op.in]: memberIds };
      }
    }
    // ADMIN: kein Filter

    // ====== KPIs - jede Query einzeln abgesichert ======
    const totalCustomers = await safeQuery('totalCustomers',
      () => Customer.count({ where: { ...customerWhere, is_active: true } }), 0);

    const totalContracts = await safeQuery('totalContracts',
      () => Contract.count({ where: contractWhere }), 0);

    const activeContracts = await safeQuery('activeContracts',
      () => Contract.count({ where: { ...contractWhere, status: 'ACTIVE' } }), 0);

    const monthContracts = await safeQuery('monthContracts',
      () => Contract.count({
        where: { ...contractWhere, created_at: { [Op.between]: [monthStart, monthEnd] } }
      }), 0);

    const pipeline = await safeQuery('pipeline',
      () => Contract.findAll({
        where: contractWhere,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('estimated_value')), 0), 'total_value']
        ],
        group: ['status'],
        raw: true
      }), []);

    const monthExpenses = await safeQuery('monthExpenses',
      () => Expense.findAll({
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
      }), [{ total: 0, deductible: 0 }]);

    const recentContracts = await safeQuery('recentContracts',
      () => Contract.findAll({
        where: contractWhere,
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [{
          model: Customer, as: 'customer',
          attributes: ['first_name', 'last_name', 'company_name']
        }, {
          model: Product, as: 'product',
          attributes: ['name'], required: false
        }, {
          model: User, as: 'user',
          attributes: ['first_name', 'last_name'], required: false
        }],
        attributes: ['id', 'status', 'estimated_value', 'created_at', 'commission_amount']
      }), []);

    // Trend: Umsaetze/Vertraege der letzten 6 Monate
    const trendData = await safeQuery('trendData', async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        months.push({
          label: d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
          start: d, end: mEnd
        });
      }

      return Promise.all(months.map(async (m) => {
        const [contractCount, contractValue, expenseTotal] = await Promise.all([
          safeQuery('trend-count', () => Contract.count({
            where: { ...contractWhere, created_at: { [Op.between]: [m.start, m.end] } }
          }), 0),
          safeQuery('trend-value', () => Contract.findAll({
            where: { ...contractWhere, created_at: { [Op.between]: [m.start, m.end] } },
            attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('estimated_value')), 0), 'total']],
            raw: true
          }), [{ total: 0 }]),
          safeQuery('trend-expenses', () => Expense.findAll({
            where: {
              ...expenseWhere,
              expense_date: { [Op.between]: [m.start.toISOString().split('T')[0], m.end.toISOString().split('T')[0]] }
            },
            attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']],
            raw: true
          }), [{ total: 0 }])
        ]);

        return {
          month: m.label,
          contracts: contractCount,
          revenue: parseFloat(contractValue[0]?.total) || 0,
          expenses: parseFloat(expenseTotal[0]?.total) || 0
        };
      }));
    }, []);

    // Forecast
    const stageProbabilities = {
      LEAD: 0.10, QUALIFIED: 0.25, OFFER: 0.50,
      NEGOTIATION: 0.75, SIGNED: 0.90, ACTIVE: 1.00,
      CANCELLED: 0, EXPIRED: 0
    };
    const forecastValue = pipeline.reduce((sum, stage) => {
      return sum + (parseFloat(stage.total_value || 0) * (stageProbabilities[stage.status] || 0));
    }, 0);
    const totalLeads = pipeline.reduce((sum, s) => sum + parseInt(s.count || 0, 10), 0);
    const closedDeals = pipeline
      .filter(s => ['SIGNED', 'ACTIVE'].includes(s.status))
      .reduce((sum, s) => sum + parseInt(s.count || 0, 10), 0);
    const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;

    const pipelineData = {};
    pipeline.forEach(s => {
      pipelineData[s.status] = {
        count: parseInt(s.count || 0, 10),
        value: parseFloat(s.total_value) || 0
      };
    });

    // Admin/Standortleitung: System-Metriken
    let systemMetrics = null;
    let providerBreakdown = null;
    if (['ADMIN', 'STANDORTLEITUNG'].includes(role)) {
      systemMetrics = await safeQuery('systemMetrics', async () => {
        const [totalUsers, activeUsers] = await Promise.all([
          User.count(),
          User.count({
            where: {
              is_active: true,
              last_login: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
          })
        ]);
        return { total_users: totalUsers, active_users_24h: activeUsers };
      }, null);

      providerBreakdown = await safeQuery('providerBreakdown', async () => {
        const productBreakdown = await Contract.findAll({
          where: { ...contractWhere, status: { [Op.in]: ['SIGNED', 'ACTIVE'] } },
          attributes: [
            'product_id',
            [sequelize.fn('COUNT', sequelize.col('Contract.id')), 'count'],
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('estimated_value')), 0), 'total_value']
          ],
          include: [{ model: Product, as: 'product', attributes: ['name'] }],
          group: ['product_id', 'product.id', 'product.name'],
          raw: true, nest: true
        });
        return productBreakdown.map(p => ({
          name: p.product?.name || 'Unbekannt',
          count: parseInt(p.count, 10),
          value: parseFloat(p.total_value) || 0
        }));
      }, null);
    }

    // Team-Performance
    let teamPerformance = null;
    if (['ADMIN', 'STANDORTLEITUNG', 'TEAMLEAD'].includes(role)) {
      const memberIds = contractWhere.user_id?.[Op.in] || null;
      if (memberIds && memberIds.length > 1) {
        teamPerformance = await safeQuery('teamPerformance', async () => {
          const perfData = await Contract.findAll({
            where: {
              user_id: { [Op.in]: memberIds },
              created_at: { [Op.between]: [monthStart, monthEnd] }
            },
            attributes: [
              'user_id',
              [sequelize.fn('COUNT', sequelize.col('Contract.id')), 'count'],
              [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('estimated_value')), 0), 'total_value']
            ],
            include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
            group: ['user_id', 'user.id', 'user.first_name', 'user.last_name'],
            raw: true, nest: true
          });
          return perfData.map(p => ({
            name: `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.trim(),
            contracts: parseInt(p.count, 10),
            revenue: parseFloat(p.total_value) || 0
          }));
        }, null);
      }
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
      trend: trendData,
      recent_contracts: recentContracts,
      system_metrics: systemMetrics,
      provider_breakdown: providerBreakdown,
      team_performance: teamPerformance
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Dashboard error:', error);
    // Auch bei Fehler: minimale Daten zurueckgeben statt 500
    res.json({
      success: true,
      data: {
        kpis: {
          customers: { total: 0 },
          contracts: { total: 0, active: 0, this_month: 0, conversion_rate: 0 },
          revenue: { forecast_value: 0, pipeline_total: 0 },
          expenses: { this_month: 0, deductible_this_month: 0 }
        },
        pipeline: {},
        trend: [],
        recent_contracts: [],
        system_metrics: null,
        provider_breakdown: null,
        team_performance: null,
        _error: error.message
      }
    });
  }
};

module.exports = { getDashboard };
