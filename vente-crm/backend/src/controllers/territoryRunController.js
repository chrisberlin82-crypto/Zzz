'use strict';

const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { assignTerritories, isPointInPolygon } = require('../services/territoryAssigner');

// ====== Run erstellen (PLZ freigeben) ======

const createRun = async (req, res) => {
  try {
    const { TerritoryRun, StreetUnit, Address, User } = req.app.locals.db;
    const sequelize = req.app.locals.db.sequelize;
    const { plz, rep_ids, valid_from, valid_until } = req.body;

    if (!plz || !rep_ids || !Array.isArray(rep_ids) || rep_ids.length === 0 || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        error: 'Pflichtfelder: plz, rep_ids (Array), valid_from, valid_until'
      });
    }

    // Pruefen ob PLZ Adressen hat
    const addressCount = await Address.count({ where: { postal_code: plz } });
    if (addressCount === 0) {
      return res.status(400).json({
        success: false,
        error: `Keine Adressen fuer PLZ ${plz} gefunden`
      });
    }

    // Pruefen ob alle Reps VERTRIEB sind
    const reps = await User.findAll({
      where: { id: { [Op.in]: rep_ids }, role: 'VERTRIEB', is_active: true }
    });
    if (reps.length !== rep_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Alle rep_ids muessen aktive VERTRIEB-User sein'
      });
    }

    // StreetUnits aggregieren/upserten aus addresses
    const streetData = await Address.findAll({
      attributes: [
        'postal_code',
        'street',
        [sequelize.fn('COUNT', sequelize.col('id')), 'addr_count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_households')), 0), 'hh_count'],
        [sequelize.fn('AVG', sequelize.col('latitude')), 'avg_lat'],
        [sequelize.fn('AVG', sequelize.col('longitude')), 'avg_lon']
      ],
      where: {
        postal_code: plz,
        street: { [Op.ne]: null, [Op.ne]: '' }
      },
      group: ['postal_code', 'street'],
      raw: true
    });

    // Upsert StreetUnits
    for (const row of streetData) {
      const addrCount = parseInt(row.addr_count, 10) || 0;
      const hhCount = parseInt(row.hh_count, 10) || 0;
      const weight = hhCount > 0 ? hhCount : addrCount;

      const [unit] = await StreetUnit.findOrCreate({
        where: { plz: row.postal_code, street: row.street },
        defaults: {
          address_count: addrCount,
          household_count: hhCount,
          centroid_lat: row.avg_lat,
          centroid_lon: row.avg_lon,
          weight
        }
      });

      // Update falls schon vorhanden
      await unit.update({
        address_count: addrCount,
        household_count: hhCount,
        centroid_lat: row.avg_lat,
        centroid_lon: row.avg_lon,
        weight
      });
    }

    // Run erstellen
    const totalWeight = streetData.reduce((sum, r) => {
      const hh = parseInt(r.hh_count, 10) || 0;
      const addr = parseInt(r.addr_count, 10) || 0;
      return sum + (hh > 0 ? hh : addr);
    }, 0);

    const run = await TerritoryRun.create({
      plz,
      status: 'draft',
      num_reps: rep_ids.length,
      target_weight: Math.round(totalWeight / rep_ids.length),
      rep_ids: rep_ids.join(','),
      valid_from,
      valid_until,
      created_by_user_id: req.user.id
    });

    logger.info(`Territory run created: ${run.id} for PLZ ${plz} with ${rep_ids.length} reps by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: {
        run,
        street_units_count: streetData.length,
        total_weight: totalWeight
      }
    });
  } catch (error) {
    logger.error('Create territory run error:', error);
    res.status(500).json({ success: false, error: 'Territory-Run konnte nicht erstellt werden' });
  }
};

// ====== Auto-Zuteilung ausfuehren ======

const assignRun = async (req, res) => {
  try {
    const { TerritoryRun, RunTerritory, RunTerritoryUnit, StreetUnit, User } = req.app.locals.db;
    const runId = req.params.runId || req.params.id;
    const run = await TerritoryRun.findByPk(runId);

    if (!run) {
      return res.status(404).json({ success: false, error: 'Run nicht gefunden' });
    }
    if (run.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Run muss im Status "draft" sein' });
    }

    // Rep-IDs aus Run
    const repIds = run.getDataValue('rep_ids')
      ? run.getDataValue('rep_ids').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      : [];

    if (repIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Keine Vertriebler im Run definiert' });
    }

    // StreetUnits laden
    const streetUnits = await StreetUnit.findAll({
      where: { plz: run.plz },
      raw: true
    });

    if (streetUnits.length === 0) {
      return res.status(400).json({ success: false, error: 'Keine StreetUnits fuer diese PLZ vorhanden' });
    }

    // Alte Territories dieses Runs loeschen (falls erneut assigned)
    await RunTerritoryUnit.destroy({
      where: {
        run_territory_id: {
          [Op.in]: (await RunTerritory.findAll({ where: { run_id: runId }, attributes: ['id'], raw: true }))
            .map(t => t.id)
        }
      }
    });
    await RunTerritory.destroy({ where: { run_id: runId } });

    // Algorithmus ausfuehren
    const result = assignTerritories(streetUnits, repIds, {
      thresholdM: 200,
      doImprovement: true
    });

    // Ergebnisse in DB speichern
    const savedTerritories = [];

    for (const t of result.territories) {
      const rt = await RunTerritory.create({
        run_id: runId,
        rep_user_id: t.repUserId,
        weight: t.weight,
        bounds_json: t.bounds ? JSON.stringify(t.bounds) : null,
        polygon_json: t.polygon ? JSON.stringify(t.polygon) : null
      });

      // Territory-Units zuweisen
      for (const suId of t.streetUnitIds) {
        await RunTerritoryUnit.create({
          run_territory_id: rt.id,
          street_unit_id: suId
        });
      }

      // Reload mit Rep-Daten
      const loaded = await RunTerritory.findByPk(rt.id, {
        include: [
          { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name', 'email'] },
          {
            model: RunTerritoryUnit, as: 'units',
            include: [{ model: StreetUnit, as: 'streetUnit' }]
          }
        ]
      });

      savedTerritories.push(loaded);
    }

    logger.info(`Territory run ${runId} assigned: ${result.territories.length} territories, balance=${result.balanceScore.toFixed(2)}`);

    res.json({
      success: true,
      data: {
        territories: savedTerritories,
        balance_score: result.balanceScore,
        total_weight: result.totalWeight
      }
    });
  } catch (error) {
    logger.error('Assign territory run error:', error);
    res.status(500).json({ success: false, error: 'Auto-Zuteilung konnte nicht durchgefuehrt werden' });
  }
};

// ====== Run aktivieren ======

const activateRun = async (req, res) => {
  try {
    const { TerritoryRun, RunTerritory } = req.app.locals.db;
    const runId = req.params.runId || req.params.id;
    const run = await TerritoryRun.findByPk(runId);

    if (!run) {
      return res.status(404).json({ success: false, error: 'Run nicht gefunden' });
    }
    if (run.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Nur Runs im Status "draft" koennen aktiviert werden' });
    }

    // Pruefen ob Territories existieren
    const territoryCount = await RunTerritory.count({ where: { run_id: runId } });
    if (territoryCount === 0) {
      return res.status(400).json({ success: false, error: 'Run hat keine Gebiete. Bitte zuerst zuteilen.' });
    }

    // Alle bisherigen aktiven Runs fuer dieselbe PLZ archivieren
    await TerritoryRun.update(
      { status: 'archived' },
      { where: { plz: run.plz, status: 'active' } }
    );

    // Diesen Run aktivieren
    await run.update({ status: 'active' });

    logger.info(`Territory run ${runId} activated for PLZ ${run.plz} by user ${req.user.id}`);

    res.json({ success: true, data: run });
  } catch (error) {
    logger.error('Activate territory run error:', error);
    res.status(500).json({ success: false, error: 'Run konnte nicht aktiviert werden' });
  }
};

// ====== Runs abfragen ======

const getRuns = async (req, res) => {
  try {
    const { TerritoryRun, RunTerritory, User } = req.app.locals.db;
    const { plz, status } = req.query;

    const where = {};
    if (plz) where.plz = plz;
    if (status) where.status = status;

    // STANDORTLEITUNG/TEAMLEAD: Nur Runs sehen wo sie Zugang haben
    // (ueber territory_assignment_id oder alle wenn ADMIN)
    const runs = await TerritoryRun.findAll({
      where,
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'first_name', 'last_name', 'email'] },
        {
          model: RunTerritory, as: 'territories',
          include: [
            { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: runs });
  } catch (error) {
    logger.error('Get territory runs error:', error);
    res.status(500).json({ success: false, error: 'Runs konnten nicht geladen werden' });
  }
};

// ====== Einzelnen Run mit Details ======

const getRun = async (req, res) => {
  try {
    const { TerritoryRun, RunTerritory, RunTerritoryUnit, StreetUnit, User } = req.app.locals.db;
    const runId = req.params.runId || req.params.id;

    const run = await TerritoryRun.findByPk(runId, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'first_name', 'last_name', 'email'] },
        {
          model: RunTerritory, as: 'territories',
          include: [
            { model: User, as: 'rep', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] },
            {
              model: RunTerritoryUnit, as: 'units',
              include: [{ model: StreetUnit, as: 'streetUnit' }]
            }
          ]
        }
      ]
    });

    if (!run) {
      return res.status(404).json({ success: false, error: 'Run nicht gefunden' });
    }

    res.json({ success: true, data: run });
  } catch (error) {
    logger.error('Get territory run error:', error);
    res.status(500).json({ success: false, error: 'Run konnte nicht geladen werden' });
  }
};

// ====== Mein aktives Run-Territory (VERTRIEB) ======

const getMyActiveRun = async (req, res) => {
  try {
    const { TerritoryRun, RunTerritory, RunTerritoryUnit, StreetUnit, Address, User } = req.app.locals.db;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Finde aktiven Run wo dieser User Rep ist
    const allActiveRuns = await TerritoryRun.findAll({
      where: {
        status: 'active',
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today }
      },
      raw: true
    });

    // Finde Runs wo user in rep_ids
    const myRuns = allActiveRuns.filter(r => {
      const ids = r.rep_ids ? r.rep_ids.split(',').map(s => parseInt(s.trim(), 10)) : [];
      return ids.includes(userId);
    });

    if (myRuns.length === 0) {
      return res.json({
        success: true,
        data: { territory: null, addresses: [], polygon: null, bounds: null }
      });
    }

    // Lade das Territory dieses Users im neuesten aktiven Run
    const run = myRuns[0];
    const territory = await RunTerritory.findOne({
      where: { run_id: run.id, rep_user_id: userId },
      include: [
        {
          model: RunTerritoryUnit, as: 'units',
          include: [{ model: StreetUnit, as: 'streetUnit' }]
        }
      ]
    });

    if (!territory) {
      return res.json({
        success: true,
        data: { territory: null, addresses: [], polygon: null, bounds: null }
      });
    }

    // Adressen aus den StreetUnits laden
    const streetNames = territory.units.map(u => u.streetUnit.street).filter(Boolean);
    const addresses = streetNames.length > 0
      ? await Address.findAll({
          where: {
            postal_code: run.plz,
            street: { [Op.in]: streetNames }
          },
          order: [['street', 'ASC'], ['house_number', 'ASC']]
        })
      : [];

    // Polygon aus Cache
    let polygon = null;
    let bounds = null;
    try {
      polygon = territory.polygon_json ? JSON.parse(territory.polygon_json) : null;
      bounds = territory.bounds_json ? JSON.parse(territory.bounds_json) : null;
    } catch { /* ignore parse errors */ }

    res.json({
      success: true,
      data: {
        run: {
          id: run.id,
          plz: run.plz,
          valid_from: run.valid_from,
          valid_until: run.valid_until,
          status: run.status
        },
        territory: {
          id: territory.id,
          weight: territory.weight,
          street_units: territory.units.map(u => u.streetUnit)
        },
        addresses,
        polygon,
        bounds
      }
    });
  } catch (error) {
    logger.error('Get my active run error:', error);
    res.status(500).json({ success: false, error: 'Mein Gebiet konnte nicht geladen werden' });
  }
};

// ====== Run loeschen ======

const deleteRun = async (req, res) => {
  try {
    const { TerritoryRun, RunTerritory, RunTerritoryUnit } = req.app.locals.db;
    const runId = req.params.runId || req.params.id;
    const run = await TerritoryRun.findByPk(runId);

    if (!run) {
      return res.status(404).json({ success: false, error: 'Run nicht gefunden' });
    }
    if (run.status === 'active') {
      return res.status(400).json({ success: false, error: 'Aktive Runs koennen nicht geloescht werden. Erst archivieren.' });
    }

    // Cascade loeschen
    const territoryIds = (await RunTerritory.findAll({ where: { run_id: runId }, attributes: ['id'], raw: true }))
      .map(t => t.id);
    if (territoryIds.length > 0) {
      await RunTerritoryUnit.destroy({ where: { run_territory_id: { [Op.in]: territoryIds } } });
    }
    await RunTerritory.destroy({ where: { run_id: runId } });
    await run.destroy();

    logger.info(`Territory run ${runId} deleted by user ${req.user.id}`);
    res.json({ success: true, message: 'Run geloescht' });
  } catch (error) {
    logger.error('Delete territory run error:', error);
    res.status(500).json({ success: false, error: 'Run konnte nicht geloescht werden' });
  }
};

module.exports = {
  createRun,
  assignRun,
  activateRun,
  getRuns,
  getRun,
  getMyActiveRun,
  deleteRun
};
