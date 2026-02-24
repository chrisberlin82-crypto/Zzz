const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { validateSignature } = require('../middleware/validate');
const signatureController = require('../controllers/signatureController');

router.use(authenticateToken);

router.post('/contract/:contractId',
  checkPermission('signatures:create'),
  param('contractId').isInt({ min: 1 }).withMessage('Ungültige Vertrags-ID'),
  validateSignature,
  signatureController.createSignature
);

router.get('/:id',
  checkPermission('signatures:read'),
  signatureController.getSignature
);

router.get('/:id/image',
  checkPermission('signatures:read'),
  signatureController.getSignatureImage
);

router.get('/:id/verify',
  checkPermission('signatures:read'),
  signatureController.verifySignature
);

module.exports = router;
