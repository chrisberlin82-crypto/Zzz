const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, requireRole } = require('../middleware/rbac');
const { validateIdParam } = require('../middleware/validate');
const territoryController = require('../controllers/territoryController');
const runController = require('../controllers/territoryRunController');

router.use(authenticateToken);

// ====== Territory Runs (MUSS vor /:id Routen stehen) ======
router.get('/runs/my-active',
  checkPermission('territories:read_own'),
  runController.getMyActiveRun
);

router.get('/runs',
  checkPermission('territories:read'),
  runController.getRuns
);

router.get('/runs/:runId',
  checkPermission('territories:read'),
  runController.getRun
);

router.post('/runs',
  checkPermission('territories:create'),
  runController.createRun
);

router.post('/runs/:runId/assign',
  checkPermission('territories:create'),
  runController.assignRun
);

router.post('/runs/:runId/activate',
  checkPermission('territories:create'),
  runController.activateRun
);

router.delete('/runs/:runId',
  checkPermission('territories:delete'),
  runController.deleteRun
);

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
