const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, scopeToUser } = require('../middleware/rbac');
const { validateCustomer, validateIdParam, validatePagination } = require('../middleware/validate');
const customerController = require('../controllers/customerController');

router.use(authenticateToken);

router.get('/',
  checkPermission('customers:read'),
  scopeToUser,
  validatePagination,
  customerController.getCustomers
);

router.get('/:id',
  checkPermission('customers:read'),
  validateIdParam,
  scopeToUser,
  customerController.getCustomer
);

router.post('/',
  checkPermission('customers:create'),
  validateCustomer,
  customerController.createCustomer
);

router.put('/:id',
  checkPermission('customers:update'),
  validateIdParam,
  scopeToUser,
  customerController.updateCustomer
);

router.delete('/:id',
  checkPermission('customers:delete'),
  validateIdParam,
  customerController.deleteCustomer
);

module.exports = router;
