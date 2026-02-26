const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const energyProviderController = require('../controllers/energyProviderController');

router.use(authenticateToken);

// Verfuegbare Energiedienstleister
router.get('/',
  checkPermission('products:read'),
  energyProviderController.getProviders
);

// Tarifsuche (PLZ + Verbrauch)
router.post('/tariff-lookup',
  checkPermission('products:read'),
  energyProviderController.tariffLookup
);

// iFrame Aktivitaet dokumentieren
router.post('/iframe-activity',
  checkPermission('products:read'),
  energyProviderController.logIframeActivity
);

// iFrame Aktivitaeten abrufen
router.get('/iframe-activities',
  checkPermission('products:read'),
  energyProviderController.getIframeActivities
);

module.exports = router;
