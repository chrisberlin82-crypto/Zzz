const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, scopeToUser } = require('../middleware/rbac');
const { validateContract, validateIdParam, validatePagination } = require('../middleware/validate');
const contractController = require('../controllers/contractController');

router.use(authenticateToken);

router.get('/',
  checkPermission('contracts:read'),
  scopeToUser,
  validatePagination,
  contractController.getContracts
);

router.get('/pipeline',
  checkPermission('contracts:read'),
  scopeToUser,
  contractController.getPipeline
);

router.get('/:id',
  checkPermission('contracts:read'),
  validateIdParam,
  scopeToUser,
  contractController.getContract
);

router.post('/',
  checkPermission('contracts:create'),
  validateContract,
  contractController.createContract
);

router.put('/:id',
  checkPermission('contracts:update'),
  validateIdParam,
  scopeToUser,
  contractController.updateContract
);

router.delete('/:id',
  checkPermission('contracts:cancel'),
  validateIdParam,
  contractController.deleteContract
);

module.exports = router;
