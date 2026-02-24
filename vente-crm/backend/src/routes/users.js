const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { validateIdParam } = require('../middleware/validate');
const userController = require('../controllers/userController');

router.use(authenticateToken);

// Location endpoints (vor ID-Parameter-Routes)
router.put('/location',
  userController.updateLocation
);

router.get('/locations',
  checkPermission('users:read'),
  userController.getTeamLocations
);

router.get('/signed-locations',
  checkPermission('signatures:read'),
  userController.getSignedContractLocations
);

router.get('/',
  checkPermission('users:read'),
  userController.getUsers
);

router.get('/:id',
  checkPermission('users:read'),
  validateIdParam,
  userController.getUser
);

router.post('/',
  checkPermission('users:create'),
  userController.createUser
);

router.put('/:id',
  checkPermission('users:update'),
  validateIdParam,
  userController.updateUser
);

router.delete('/:id',
  checkPermission('users:delete'),
  validateIdParam,
  userController.deleteUser
);

module.exports = router;
