const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const dashboardController = require('../controllers/dashboardController');

router.use(authenticateToken);

router.get('/',
  checkPermission('dashboard:read'),
  dashboardController.getDashboard
);

module.exports = router;
