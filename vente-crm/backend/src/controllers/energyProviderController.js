const logger = require('../utils/logger');

/**
 * Energiedienstleister-Integration
 *
 * GASAG und E.ON bieten keine oeffentlichen APIs fuer Drittanbieter-Verkauf an.
 * Integration laeuft ueber Vermittler: Ennux, EnerConnex, Verivox, egON
 *
 * Dieses Modul stellt Platzhalter-Endpoints bereit, die spaeter mit
 * konkreten Partner-APIs verbunden werden koennen.
 */

// Konfiguration fuer Energiedienstleister-Partner
const ENERGY_PROVIDERS = {
  GASAG: {
    name: 'GASAG',
    region: 'Berlin / Brandenburg',
    website: 'https://www.gasag.de',
    categories: ['GAS', 'STROM', 'WAERME'],
    integration_status: 'PENDING',
    integration_type: 'PARTNER_PORTAL',
    notes: 'Kein oeffentliches API - Integration ueber Vertriebspartnerschaft oder Ennux/EnerConnex'
  },
  EON: {
    name: 'E.ON',
    region: 'Bundesweit',
    website: 'https://www.eon.de',
    categories: ['STROM', 'GAS', 'SOLAR', 'WAERMEPUMPE'],
    integration_status: 'PENDING',
    integration_type: 'DEVELOPER_PORTAL',
    developer_portal: 'https://developer.onetp.eon.com',
    notes: 'E.ON One Developer Portal verfuegbar (OAuth2) - API-Katalog erfordert Authentifizierung'
  }
};

// Vermittler-Konfiguration
const INTERMEDIARIES = {
  VERIVOX: {
    name: 'Verivox Energie Webservice',
    type: 'TARIFF_COMPARISON',
    integration: 'API / iFrame',
    website: 'https://www.verivox.de',
    capabilities: ['tariff_lookup', 'price_comparison', 'order_forwarding']
  },
  ENNUX: {
    name: 'Ennux',
    type: 'DISTRIBUTION_PLATFORM',
    integration: 'Portal / API',
    website: 'https://www.ennux.de',
    capabilities: ['multi_provider', 'tariff_calculator', 'digital_order', 'commission_tracking']
  },
  ENERCONNEX: {
    name: 'EnerConnex',
    type: 'DISTRIBUTION_PLATFORM',
    integration: 'Portal / API',
    website: 'https://www.enerconnex.de',
    capabilities: ['multi_provider', 'tariff_calculator', 'digital_order']
  }
};

/**
 * GET /api/energy-providers - Verfuegbare Energiedienstleister
 */
const getProviders = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        providers: Object.values(ENERGY_PROVIDERS),
        intermediaries: Object.values(INTERMEDIARIES)
      }
    });
  } catch (error) {
    logger.error('Get energy providers error:', error);
    res.status(500).json({ success: false, error: 'Energiedienstleister konnten nicht geladen werden' });
  }
};

/**
 * POST /api/energy-providers/tariff-lookup - Tarifsuche (Platzhalter)
 */
const tariffLookup = async (req, res) => {
  try {
    const { postal_code, consumption_kwh, category } = req.body;

    if (!postal_code || !consumption_kwh) {
      return res.status(400).json({
        success: false,
        error: 'PLZ und Verbrauch (kWh) erforderlich'
      });
    }

    // Platzhalter-Antwort - wird spaeter mit echtem API-Aufruf ersetzt
    const results = [
      {
        provider: 'GASAG',
        tariff_name: 'GASAG Erdgas Fix',
        category: category || 'GAS',
        base_price_monthly: 8.90,
        working_price_ct: 6.52,
        estimated_monthly: ((consumption_kwh * 6.52 / 100) / 12 + 8.90).toFixed(2),
        duration_months: 12,
        is_eco: false,
        source: 'PLACEHOLDER'
      },
      {
        provider: 'E.ON',
        tariff_name: 'E.ON Strom Oeko',
        category: category || 'STROM',
        base_price_monthly: 11.90,
        working_price_ct: 29.99,
        estimated_monthly: ((consumption_kwh * 29.99 / 100) / 12 + 11.90).toFixed(2),
        duration_months: 12,
        is_eco: true,
        source: 'PLACEHOLDER'
      },
      {
        provider: 'E.ON',
        tariff_name: 'E.ON Strom Fix 24',
        category: category || 'STROM',
        base_price_monthly: 9.90,
        working_price_ct: 31.49,
        estimated_monthly: ((consumption_kwh * 31.49 / 100) / 12 + 9.90).toFixed(2),
        duration_months: 24,
        is_eco: false,
        source: 'PLACEHOLDER'
      }
    ];

    res.json({
      success: true,
      data: {
        postal_code,
        consumption_kwh,
        tariffs: results,
        notice: 'Platzhalter-Daten. Echte Tarife werden ueber Partner-Integration bereitgestellt.'
      }
    });
  } catch (error) {
    logger.error('Tariff lookup error:', error);
    res.status(500).json({ success: false, error: 'Tarifsuche fehlgeschlagen' });
  }
};

/**
 * POST /api/energy-providers/iframe-activity - iFrame Aktivitaet dokumentieren
 */
const logIframeActivity = async (req, res) => {
  try {
    const { AuditLog } = req.app.locals.db;
    const { url, action, details, duration_seconds } = req.body;

    if (!url || !action) {
      return res.status(400).json({
        success: false,
        error: 'URL und Aktion erforderlich'
      });
    }

    // Aktivitaet im Audit-Log dokumentieren
    await AuditLog.create({
      user_id: req.user.id,
      action: `IFRAME_${action.toUpperCase()}`,
      entity_type: 'IFRAME_ACTIVITY',
      entity_id: null,
      changes: JSON.stringify({
        url,
        action,
        details: details || null,
        duration_seconds: duration_seconds || null,
        timestamp: new Date().toISOString(),
        user_agent: req.headers['user-agent'] || null
      })
    });

    res.json({ success: true, message: 'Aktivitaet dokumentiert' });
  } catch (error) {
    logger.error('Log iframe activity error:', error);
    res.status(500).json({ success: false, error: 'Aktivitaet konnte nicht dokumentiert werden' });
  }
};

/**
 * GET /api/energy-providers/iframe-activities - iFrame Aktivitaeten abrufen
 */
const getIframeActivities = async (req, res) => {
  try {
    const { AuditLog, User } = req.app.locals.db;
    const { Op } = require('sequelize');
    const { user_id, limit: queryLimit } = req.query;

    const where = {
      entity_type: 'IFRAME_ACTIVITY'
    };

    // VERTRIEB sieht nur eigene, andere sehen alle
    if (req.user.role === 'VERTRIEB') {
      where.user_id = req.user.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    const activities = await AuditLog.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(queryLimit) || 50
    });

    res.json({ success: true, data: activities });
  } catch (error) {
    logger.error('Get iframe activities error:', error);
    res.status(500).json({ success: false, error: 'Aktivitaeten konnten nicht geladen werden' });
  }
};

module.exports = {
  getProviders,
  tariffLookup,
  logIframeActivity,
  getIframeActivities,
  ENERGY_PROVIDERS,
  INTERMEDIARIES
};
