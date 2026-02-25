const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, requireRole } = require('../middleware/rbac');
const { validateIdParam } = require('../middleware/validate');
const territoryController = require('../controllers/territoryController');

router.use(authenticateToken);

// ====== Verfuegbare PLZ aus Adresslisten ======
router.get('/available-plz',
  checkPermission('territories:read'),
  territoryController.getAvailablePostalCodes
);

// ====== Admin: Gebietszuweisungen verwalten ======
router.get('/',
  checkPermission('territories:read'),
  territoryController.getAllTerritoryAssignments
);

router.post('/',
  checkPermission('territories:create'),
  territoryController.createTerritoryAssignment
);

router.put('/:id',
  checkPermission('territories:update'),
  validateIdParam,
  territoryController.updateTerritoryAssignment
);

router.delete('/:id',
  checkPermission('territories:delete'),
  validateIdParam,
  territoryController.deleteTerritoryAssignment
);

// ====== Standortleiter/Teamleiter: Eigene Gebiete sehen ======
router.get('/my-assignments',
  checkPermission('territories:read', 'territories:read_own'),
  territoryController.getMyTerritoryAssignment
);

// Strassen/Hausnummern fuer ein Gebiet laden
router.get('/:id/addresses',
  checkPermission('territories:read'),
  validateIdParam,
  territoryController.getTerritoryAddresses
);

// ====== Vertriebler an Strassen/Gebiete zuweisen ======
router.post('/salesperson',
  checkPermission('territories:assign'),
  territoryController.assignSalesperson
);

router.put('/salesperson/:id',
  checkPermission('territories:assign'),
  validateIdParam,
  territoryController.updateSalespersonTerritory
);

router.delete('/salesperson/:id',
  checkPermission('territories:assign'),
  validateIdParam,
  territoryController.deleteSalespersonTerritory
);

// ====== Vertriebler: Mein Gebiet (Karte) ======
router.get('/my-territory',
  checkPermission('territories:read_own'),
  territoryController.getMyTerritory
);

module.exports = router;
