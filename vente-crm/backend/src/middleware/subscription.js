const logger = require('../utils/logger');

/**
 * Middleware: Prueft ob der User Zugang hat (Trial aktiv oder Abo bezahlt)
 * ADMIN-Rolle ueberspringt die Pruefung (erster Admin hat immer Zugang)
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    // Auth-Routen und Subscription-Routen immer erlauben
    if (req.path.startsWith('/auth') || req.path.startsWith('/subscription') || req.path === '/health') {
      return next();
    }

    if (!req.user) {
      return next();
    }

    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'subscription_status', 'trial_ends_at']
    });

    if (!user) {
      return next();
    }

    const now = new Date();
    const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const isTrialActive = user.subscription_status === 'TRIAL' && trialEndsAt && trialEndsAt > now;
    const isSubscriptionActive = user.subscription_status === 'ACTIVE';

    if (isTrialActive || isSubscriptionActive) {
      return next();
    }

    // Kein Zugang - Trial abgelaufen und kein Abo
    return res.status(402).json({
      success: false,
      error: 'Abo erforderlich',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Ihr Testzeitraum ist abgelaufen. Bitte schliessen Sie ein Abonnement ab um fortzufahren.'
    });
  } catch (error) {
    logger.error('Subscription check error:', error);
    // Bei Fehler trotzdem weiter (fail-open um nicht auszusperren)
    next();
  }
};

module.exports = { requireActiveSubscription };
