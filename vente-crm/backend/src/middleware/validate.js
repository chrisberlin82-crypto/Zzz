const { body, param, query, validationResult } = require('express-validator');

/**
 * Allgemeine Validierungsergebnis-Prüfung
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }))
    });
  }
  next();
};

// Kunden-Validierung
const validateCustomer = [
  body('first_name').trim().isLength({ min: 1, max: 100 })
    .withMessage('Vorname ist erforderlich (max. 100 Zeichen)'),
  body('last_name').trim().isLength({ min: 1, max: 100 })
    .withMessage('Nachname ist erforderlich (max. 100 Zeichen)'),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail()
    .withMessage('Ungültige E-Mail-Adresse'),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('postal_code').optional({ nullable: true }).matches(/^\d{5}$/)
    .withMessage('PLZ muss 5-stellig sein'),
  body('type').optional().isIn(['PRIVATE', 'BUSINESS']),
  body('source').optional().isIn(['ONLINE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'PARTNER', 'OTHER']),
  body('gdpr_consent').optional().isBoolean(),
  handleValidationErrors
];

// Vertrags-Validierung
const validateContract = [
  body('customer_id').isInt({ min: 1 }).withMessage('Kunden-ID ist erforderlich'),
  body('product_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('status').optional().isIn([
    'LEAD', 'QUALIFIED', 'OFFER', 'NEGOTIATION', 'SIGNED', 'ACTIVE', 'CANCELLED', 'EXPIRED'
  ]),
  body('consumption').optional({ nullable: true }).isInt({ min: 0 }),
  body('estimated_value').optional({ nullable: true }).isDecimal(),
  body('duration').optional({ nullable: true }).isInt({ min: 1, max: 120 }),
  handleValidationErrors
];

// Ausgaben-Validierung
const validateExpense = [
  body('amount').isDecimal({ decimal_digits: '0,2' })
    .withMessage('Betrag ist erforderlich'),
  body('category_id').isInt({ min: 1 }).withMessage('Kategorie ist erforderlich'),
  body('description').trim().isLength({ min: 1, max: 500 })
    .withMessage('Beschreibung ist erforderlich (max. 500 Zeichen)'),
  body('expense_date').isISO8601().withMessage('Gültiges Datum erforderlich'),
  handleValidationErrors
];

// Registrierungs-Validierung
const validateRegistration = [
  body('email').isEmail().normalizeEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('password').isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen haben')
    .matches(/[A-Z]/).withMessage('Passwort muss Großbuchstaben enthalten')
    .matches(/[a-z]/).withMessage('Passwort muss Kleinbuchstaben enthalten')
    .matches(/[0-9]/).withMessage('Passwort muss Zahlen enthalten')
    .matches(/[!@#$%^&*]/).withMessage('Passwort muss Sonderzeichen enthalten'),
  body('company_name').trim().isLength({ min: 1, max: 255 })
    .withMessage('Firmenname ist erforderlich'),
  handleValidationErrors
];

// Login-Validierung
const validateLogin = [
  body('email').isEmail().normalizeEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('password').isLength({ min: 1 })
    .withMessage('Passwort ist erforderlich'),
  handleValidationErrors
];

// Signatur-Validierung
const validateSignature = [
  body('signedAt').isISO8601().withMessage('Gültiger Zeitstempel erforderlich'),
  body('consent').isBoolean().withMessage('Einwilligung erforderlich'),
  body('signature.pngBase64').isLength({ min: 100 })
    .withMessage('Signatur-Daten erforderlich'),
  body('signature.hash').isLength({ min: 10 })
    .withMessage('Signatur-Hash erforderlich'),
  handleValidationErrors
];

// Paginierungs-Validierung
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors
];

// ID-Parameter Validierung
const validateIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Ungültige ID'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCustomer,
  validateContract,
  validateExpense,
  validateRegistration,
  validateLogin,
  validateSignature,
  validatePagination,
  validateIdParam
};
