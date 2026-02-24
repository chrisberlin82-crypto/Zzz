const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

// Oeffentlich: Preise abrufen
router.get('/prices', subscriptionController.getPrices);

// Webhook (muss VOR json-parsing kommen - wird in server.js separat eingebunden)
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

// Authentifiziert
router.get('/status', authenticateToken, subscriptionController.getSubscriptionStatus);
router.post('/create-checkout', authenticateToken, subscriptionController.createCheckoutSession);
router.post('/portal', authenticateToken, subscriptionController.createPortalSession);

module.exports = router;
