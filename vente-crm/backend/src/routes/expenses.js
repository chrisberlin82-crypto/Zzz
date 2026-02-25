const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, scopeToUser } = require('../middleware/rbac');
const { validateExpense, validateIdParam } = require('../middleware/validate');
const expenseController = require('../controllers/expenseController');

// Multer Konfiguration fuer Beleg-Uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt_${req.user.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.heic', '.heif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder (JPG, PNG, HEIC) und PDF erlaubt'));
    }
  }
});

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

// Beleg-Foto hochladen
router.post('/:id/receipt',
  checkPermission('expenses:update'),
  validateIdParam,
  scopeToUser,
  upload.single('receipt'),
  expenseController.uploadReceipt
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
