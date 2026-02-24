const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, requireMinRole } = require('../middleware/rbac');
const { validateIdParam } = require('../middleware/validate');
const productController = require('../controllers/productController');

router.use(authenticateToken);

router.get('/',
  checkPermission('products:read'),
  productController.getProducts
);

router.get('/:id',
  checkPermission('products:read'),
  validateIdParam,
  productController.getProduct
);

router.post('/',
  checkPermission('products:create'),
  productController.createProduct
);

router.put('/:id',
  checkPermission('products:update'),
  validateIdParam,
  productController.updateProduct
);

router.delete('/:id',
  checkPermission('products:delete'),
  validateIdParam,
  productController.deleteProduct
);

module.exports = router;
