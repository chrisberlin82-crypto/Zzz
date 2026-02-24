const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, scopeToUser } = require('../middleware/rbac');
const { validateExpense, validateIdParam } = require('../middleware/validate');
const expenseController = require('../controllers/expenseController');

router.use(authenticateToken);

router.get('/categories',
  checkPermission('expenses:read'),
  expenseController.getCategories
);

router.get('/export',
  checkPermission('expenses:export'),
  scopeToUser,
  expenseController.exportExpenses
);

router.get('/',
  checkPermission('expenses:read'),
  scopeToUser,
  expenseController.getExpenses
);

router.post('/',
  checkPermission('expenses:create'),
  validateExpense,
  expenseController.createExpense
);

router.put('/:id',
  checkPermission('expenses:update'),
  validateIdParam,
  scopeToUser,
  expenseController.updateExpense
);

router.delete('/:id',
  checkPermission('expenses:delete'),
  validateIdParam,
  scopeToUser,
  expenseController.deleteExpense
);

module.exports = router;
