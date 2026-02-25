const { Op } = require('sequelize');
const logger = require('../utils/logger');

// ====== TERRITORY ASSIGNMENTS (Admin -> Standortleiter/Teamleiter) ======

const getAllTerritoryAssignments = async (req, res) => {
  try {
    const { TerritoryAssignment, User } = req.app.locals.db;
    const { active_only } = req.query;

    const where = {};
    if (active_only === 'true') {
      where.is_active = true;
      where.valid_until = { [Op.gte]: new Date() };
    }

    const assignments = await TerritoryAssignment.findAll({
      where,
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] },
        { model: User, as: 'assignedBy', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get territory assignments error:', error);
    res.status(500).json({ success: false, error: 'Gebietszuweisungen konnten nicht geladen werden' });
  }
};

const createTerritoryAssignment = async (req, res) => {
  try {
    const { TerritoryAssignment, User } = req.app.locals.db;
    const { assigned_to_user_id, postal_codes, name, valid_from, valid_until, rotation_days, notes } = req.body;

    if (!assigned_to_user_id || !postal_codes || !valid_from || !valid_until) {
      return res.status(400).json({ success: false, error: 'Pflichtfelder: assigned_to_user_id, postal_codes, valid_from, valid_until' });
    }

    // Pruefen ob Benutzer existiert und Standortleitung/Teamlead ist
    const targetUser = await User.findByPk(assigned_to_user_id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }
    if (!['STANDORTLEITUNG', 'TEAMLEAD'].includes(targetUser.role)) {
      return res.status(400).json({ success: false, error: 'Gebiete koennen nur Standortleitern oder Teamleitern zugewiesen werden' });
    }

    const assignment = await TerritoryAssignment.create({
      assigned_to_user_id,
      assigned_by_user_id: req.user.id,
      postal_codes: Array.isArray(postal_codes) ? postal_codes.join(',') : postal_codes,
      name: name || null,
      valid_from,
      valid_until,
      rotation_days: rotation_days || 14,
      notes: notes || null
    });

    // Reload mit Associations
    const result = await TerritoryAssignment.findByPk(assignment.id, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] },
        { model: User, as: 'assignedBy', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    logger.info(`Territory assigned: ${assignment.id} to user ${assigned_to_user_id} by ${req.user.id}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Create territory assignment error:', error);
    res.status(500).json({ success: false, error: 'Gebietszuweisung konnte nicht erstellt werden' });
  }
};

const updateTerritoryAssignment = async (req, res) => {
  try {
    const { TerritoryAssignment, User } = req.app.locals.db;
    const assignment = await TerritoryAssignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Gebietszuweisung nicht gefunden' });
    }

    const allowedFields = ['postal_codes', 'name', 'valid_from', 'valid_until', 'rotation_days', 'is_active', 'notes'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'postal_codes') {
          updates[f] = Array.isArray(req.body[f]) ? req.body[f].join(',') : req.body[f];
        } else {
          updates[f] = req.body[f];
        }
      }
    });

    await assignment.update(updates);

    const result = await TerritoryAssignment.findByPk(assignment.id, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] },
        { model: User, as: 'assignedBy', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Update territory assignment error:', error);
    res.status(500).json({ success: false, error: 'Gebietszuweisung konnte nicht aktualisiert werden' });
  }
};

const deleteTerritoryAssignment = async (req, res) => {
  try {
    const { TerritoryAssignment, SalespersonTerritory } = req.app.locals.db;
    const assignment = await TerritoryAssignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Gebietszuweisung nicht gefunden' });
    }

    // Auch zugehoerige Vertriebler-Zuweisungen loeschen
    await SalespersonTerritory.destroy({ where: { territory_assignment_id: assignment.id } });
    await assignment.destroy();

    res.json({ success: true, message: 'Gebietszuweisung geloescht' });
  } catch (error) {
    logger.error('Delete territory assignment error:', error);
    res.status(500).json({ success: false, error: 'Gebietszuweisung konnte nicht geloescht werden' });
  }
};

// ====== SALESPERSON TERRITORIES (Standortleiter/Teamleiter -> Vertriebler) ======

const getMyTerritoryAssignment = async (req, res) => {
  try {
    const { TerritoryAssignment, SalespersonTerritory, User } = req.app.locals.db;
    const today = new Date().toISOString().split('T')[0];

    // Aktive Gebietszuweisungen fuer den aktuellen Benutzer
    const assignments = await TerritoryAssignment.findAll({
      where: {
        assigned_to_user_id: req.user.id,
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today }
      },
      include: [
        {
          model: SalespersonTerritory,
          as: 'salespersonTerritories',
          include: [
            { model: User, as: 'salesperson', attributes: ['id', 'first_name', 'last_name', 'email', 'role'] }
          ]
        },
        { model: User, as: 'assignedBy', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error('Get my territory assignment error:', error);
    res.status(500).json({ success: false, error: 'Gebiete konnten nicht geladen werden' });
  }
};

// Strassen + Hausnummern fuer ein PLZ-Gebiet aus den vorhandenen Adressen laden
const getTerritoryAddresses = async (req, res) => {
  try {
    const { TerritoryAssignment, Address } = req.app.locals.db;
    const assignment = await TerritoryAssignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Gebietszuweisung nicht gefunden' });
    }

    // Sicherheitspruefung: Nur eigenes Gebiet oder Admin
    if (req.user.role !== 'ADMIN' && assignment.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Kein Zugriff auf dieses Gebiet' });
    }

    const postalCodes = assignment.postal_codes;

    // Alle Adressen in den PLZ-Gebieten finden
    const addresses = await Address.findAll({
      where: {
        postal_code: { [Op.in]: postalCodes }
      },
      order: [['street', 'ASC'], ['house_number', 'ASC']]
    });

    // Nach Strasse gruppieren
    const streetMap = {};
    addresses.forEach(addr => {
      const street = addr.street || 'Unbekannt';
      if (!streetMap[street]) {
        streetMap[street] = {
          street,
          postal_code: addr.postal_code,
          city: addr.city,
          addresses: []
        };
      }
      streetMap[street].addresses.push(addr);
    });

    res.json({
      success: true,
      data: {
        assignment,
        postal_codes: postalCodes,
        streets: Object.values(streetMap),
        total_addresses: addresses.length
      }
    });
  } catch (error) {
    logger.error('Get territory addresses error:', error);
    res.status(500).json({ success: false, error: 'Gebiet-Adressen konnten nicht geladen werden' });
  }
};

const assignSalesperson = async (req, res) => {
  try {
    const { TerritoryAssignment, SalespersonTerritory, User } = req.app.locals.db;
    const { territory_assignment_id, salesperson_user_id, postal_codes, streets, notes } = req.body;

    if (!territory_assignment_id || !salesperson_user_id || !postal_codes) {
      return res.status(400).json({ success: false, error: 'Pflichtfelder: territory_assignment_id, salesperson_user_id, postal_codes' });
    }

    // Pruefen ob TerritoryAssignment existiert
    const assignment = await TerritoryAssignment.findByPk(territory_assignment_id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Gebietszuweisung nicht gefunden' });
    }

    // Sicherheit: Nur eigenes Gebiet oder Admin
    if (req.user.role !== 'ADMIN' && assignment.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Kein Zugriff auf dieses Gebiet' });
    }

    // Pruefen ob Vertriebler existiert
    const salesperson = await User.findByPk(salesperson_user_id);
    if (!salesperson) {
      return res.status(404).json({ success: false, error: 'Vertriebler nicht gefunden' });
    }
    if (salesperson.role !== 'VERTRIEB') {
      return res.status(400).json({ success: false, error: 'Nur Vertriebler koennen Gebiete zugewiesen bekommen' });
    }

    // PLZ-Pruefung: Nur PLZs aus dem uebergeordneten Gebiet erlaubt
    const assignedCodes = Array.isArray(postal_codes) ? postal_codes : postal_codes.split(',').map(s => s.trim());
    const parentCodes = assignment.postal_codes;
    const invalidCodes = assignedCodes.filter(c => !parentCodes.includes(c));
    if (invalidCodes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `PLZ nicht im Gebiet: ${invalidCodes.join(', ')}`
      });
    }

    const spTerritory = await SalespersonTerritory.create({
      territory_assignment_id,
      salesperson_user_id,
      assigned_by_user_id: req.user.id,
      postal_codes: assignedCodes.join(','),
      streets: streets || null,
      notes: notes || null
    });

    const result = await SalespersonTerritory.findByPk(spTerritory.id, {
      include: [
        { model: User, as: 'salesperson', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: TerritoryAssignment, as: 'territoryAssignment' }
      ]
    });

    logger.info(`Salesperson territory assigned: ${spTerritory.id} to user ${salesperson_user_id}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Assign salesperson territory error:', error);
    res.status(500).json({ success: false, error: 'Vertriebler-Zuweisung konnte nicht erstellt werden' });
  }
};

const updateSalespersonTerritory = async (req, res) => {
  try {
    const { SalespersonTerritory, TerritoryAssignment, User } = req.app.locals.db;
    const spTerritory = await SalespersonTerritory.findByPk(req.params.id, {
      include: [{ model: TerritoryAssignment, as: 'territoryAssignment' }]
    });

    if (!spTerritory) {
      return res.status(404).json({ success: false, error: 'Vertriebler-Zuweisung nicht gefunden' });
    }

    // Sicherheit
    if (req.user.role !== 'ADMIN' && spTerritory.territoryAssignment.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Kein Zugriff' });
    }

    const allowedFields = ['postal_codes', 'streets', 'is_active', 'notes'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'postal_codes') {
          updates[f] = Array.isArray(req.body[f]) ? req.body[f].join(',') : req.body[f];
        } else if (f === 'streets') {
          updates[f] = req.body[f] ? JSON.stringify(req.body[f]) : null;
        } else {
          updates[f] = req.body[f];
        }
      }
    });

    await spTerritory.update(updates);

    const result = await SalespersonTerritory.findByPk(spTerritory.id, {
      include: [
        { model: User, as: 'salesperson', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: TerritoryAssignment, as: 'territoryAssignment' }
      ]
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Update salesperson territory error:', error);
    res.status(500).json({ success: false, error: 'Vertriebler-Zuweisung konnte nicht aktualisiert werden' });
  }
};

const deleteSalespersonTerritory = async (req, res) => {
  try {
    const { SalespersonTerritory, TerritoryAssignment } = req.app.locals.db;
    const spTerritory = await SalespersonTerritory.findByPk(req.params.id, {
      include: [{ model: TerritoryAssignment, as: 'territoryAssignment' }]
    });

    if (!spTerritory) {
      return res.status(404).json({ success: false, error: 'Vertriebler-Zuweisung nicht gefunden' });
    }

    if (req.user.role !== 'ADMIN' && spTerritory.territoryAssignment.assigned_to_user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Kein Zugriff' });
    }

    await spTerritory.destroy();
    res.json({ success: true, message: 'Vertriebler-Zuweisung geloescht' });
  } catch (error) {
    logger.error('Delete salesperson territory error:', error);
    res.status(500).json({ success: false, error: 'Vertriebler-Zuweisung konnte nicht geloescht werden' });
  }
};

// ====== VERTRIEBLER: Mein Gebiet laden ======

const getMyTerritory = async (req, res) => {
  try {
    const { SalespersonTerritory, TerritoryAssignment, Address, User } = req.app.locals.db;
    const today = new Date().toISOString().split('T')[0];

    // Aktive Vertriebler-Gebiete laden
    const myTerritories = await SalespersonTerritory.findAll({
      where: {
        salesperson_user_id: req.user.id,
        is_active: true
      },
      include: [{
        model: TerritoryAssignment,
        as: 'territoryAssignment',
        where: {
          is_active: true,
          valid_from: { [Op.lte]: today },
          valid_until: { [Op.gte]: today }
        }
      }]
    });

    if (myTerritories.length === 0) {
      return res.json({
        success: true,
        data: { territories: [], addresses: [], bounds: null }
      });
    }

    // Alle PLZs und Strassen sammeln
    const allPostalCodes = [];
    const streetFilters = [];
    myTerritories.forEach(t => {
      const codes = t.postal_codes;
      allPostalCodes.push(...codes);
      if (t.streets) {
        streetFilters.push({ postalCodes: codes, streets: t.streets });
      }
    });

    const uniquePostalCodes = [...new Set(allPostalCodes)];

    // Adressen laden
    const addressWhere = { postal_code: { [Op.in]: uniquePostalCodes } };
    let addresses = await Address.findAll({
      where: addressWhere,
      order: [['street', 'ASC'], ['house_number', 'ASC']]
    });

    // Wenn Strassen-Filter gesetzt, nur diese Strassen anzeigen
    if (streetFilters.length > 0) {
      addresses = addresses.filter(addr => {
        return streetFilters.some(sf => {
          const inPLZ = sf.postalCodes.includes(addr.postal_code);
          const inStreet = sf.streets.some(s =>
            addr.street && addr.street.toLowerCase().includes(s.toLowerCase())
          );
          return inPLZ && inStreet;
        });
      });
    }

    // Bounds berechnen fuer Karten-Rahmen
    const geocoded = addresses.filter(a => a.latitude && a.longitude);
    let bounds = null;
    let center = null;

    if (geocoded.length > 0) {
      const lats = geocoded.map(a => parseFloat(a.latitude));
      const lons = geocoded.map(a => parseFloat(a.longitude));
      bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lons),
        west: Math.min(...lons)
      };
      center = {
        latitude: lats.reduce((a, b) => a + b) / lats.length,
        longitude: lons.reduce((a, b) => a + b) / lons.length
      };
    }

    res.json({
      success: true,
      data: {
        territories: myTerritories,
        postal_codes: uniquePostalCodes,
        addresses,
        center,
        bounds
      }
    });
  } catch (error) {
    logger.error('Get my territory error:', error);
    res.status(500).json({ success: false, error: 'Mein Gebiet konnte nicht geladen werden' });
  }
};

// ====== Verfuegbare PLZ aus Adresslisten laden ======

const getAvailablePostalCodes = async (req, res) => {
  try {
    const { Address } = req.app.locals.db;
    const sequelize = req.app.locals.db.sequelize;

    const results = await Address.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('postal_code')), 'postal_code'],
        [sequelize.fn('MIN', sequelize.col('city')), 'city']
      ],
      where: {
        postal_code: { [Op.ne]: null, [Op.ne]: '' }
      },
      group: ['postal_code'],
      order: [['postal_code', 'ASC']],
      raw: true
    });

    const postalCodes = results
      .filter(r => r.postal_code && /^\d{5}$/.test(r.postal_code))
      .map(r => ({
        plz: r.postal_code,
        city: r.city || ''
      }));

    res.json({ success: true, data: postalCodes });
  } catch (error) {
    logger.error('Get available postal codes error:', error);
    res.status(500).json({ success: false, error: 'PLZ konnten nicht geladen werden' });
  }
};

module.exports = {
  getAllTerritoryAssignments,
  createTerritoryAssignment,
  updateTerritoryAssignment,
  deleteTerritoryAssignment,
  getMyTerritoryAssignment,
  getTerritoryAddresses,
  assignSalesperson,
  updateSalespersonTerritory,
  deleteSalespersonTerritory,
  getMyTerritory,
  getAvailablePostalCodes
};
