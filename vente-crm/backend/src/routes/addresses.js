const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, scopeToUser } = require('../middleware/rbac');
const { validateIdParam } = require('../middleware/validate');
const addressController = require('../controllers/addressController');

router.use(authenticateToken);

router.get('/',
  checkPermission('addresses:read'),
  scopeToUser,
  addressController.getAddressLists
);

router.post('/import',
  checkPermission('addresses:import'),
  addressController.upload.single('file'),
  addressController.importAddressList
);

router.get('/:id/map-data',
  checkPermission('addresses:read'),
  validateIdParam,
  addressController.getMapData
);

router.post('/:id/geocode',
  checkPermission('addresses:update'),
  validateIdParam,
  addressController.geocodeAddressList
);

router.put('/:id/addresses/:addressId',
  checkPermission('addresses:update'),
  validateIdParam,
  addressController.updateAddress
);

router.delete('/:id',
  checkPermission('addresses:delete'),
  validateIdParam,
  addressController.deleteAddressList
);

module.exports = router;
