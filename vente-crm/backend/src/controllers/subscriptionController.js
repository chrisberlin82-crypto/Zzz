const logger = require('../utils/logger');

// Preise pro Rolle (netto in Cent)
const ROLE_PRICES = {
  ADMIN: 49900,            // 499,00 EUR
  STANDORTLEITUNG: 29900,  // 299,00 EUR
  TEAMLEAD: 24900,         // 249,00 EUR
  BACKOFFICE: 4900,        // 49,00 EUR
  VERTRIEB: 4900           // 49,00 EUR
};

const VAT_RATE = 0.19; // 19% MwSt

const TRIAL_DAYS = 30;

// Add-On Produkte
const ADDON_PRODUCTS = {
  EUER_RECHNER: {
    id: 'euer_rechner',
    name: 'Einnahmen-Ueberschuss-Rechner',
    description: 'Professioneller EUeR fuer Vertriebsmitarbeiter. Alle Einnahmen und Ausgaben automatisch erfasst, steueroptimiert und exportfertig.',
    price_net_cents: 995,   // 9,95 EUR netto
    interval: 'month',
    paid_by: 'SELF',        // Wird vom Vertriebler selbst bezahlt
    features: [
      'Automatische Kategorisierung (SKR03)',
      'Steuerlich absetzbare Betraege',
      'Export fuer Steuerberater (DATEV)',
      'Monats- und Jahresuebersicht',
      'Belege fotografieren und zuordnen',
      'Vorsteuerabzug-Berechnung'
    ]
  }
};

const getPriceForRole = (role) => {
  const netCents = ROLE_PRICES[role] || 4900;
  const grossCents = Math.round(netCents * (1 + VAT_RATE));
  return { netCents, grossCents, vatCents: grossCents - netCents };
};

// Stripe lazy-load (nur wenn konfiguriert)
let stripe = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

/**
 * GET /api/subscription/status - Abo-Status des aktuellen Users
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'role', 'trial_ends_at', 'subscription_status',
                   'subscription_plan', 'subscription_price_cents',
                   'subscription_started_at', 'subscription_ends_at']
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const price = getPriceForRole(user.role);
    const now = new Date();
    const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))) : 0;
    const isTrialActive = user.subscription_status === 'TRIAL' && trialEndsAt && trialEndsAt > now;
    const isSubscriptionActive = user.subscription_status === 'ACTIVE';
    const hasAccess = isTrialActive || isSubscriptionActive;

    res.json({
      success: true,
      data: {
        subscription_status: user.subscription_status,
        trial_ends_at: user.trial_ends_at,
        trial_days_left: trialDaysLeft,
        is_trial_active: isTrialActive,
        is_subscription_active: isSubscriptionActive,
        has_access: hasAccess,
        subscription_started_at: user.subscription_started_at,
        subscription_ends_at: user.subscription_ends_at,
        role: user.role,
        price: {
          net: price.netCents / 100,
          gross: price.grossCents / 100,
          vat: price.vatCents / 100,
          currency: 'EUR'
        }
      }
    });
  } catch (error) {
    logger.error('Get subscription status error:', error);
    res.status(500).json({ success: false, error: 'Abo-Status konnte nicht geladen werden' });
  }
};

/**
 * GET /api/subscription/prices - Alle Preise
 */
const getPrices = async (req, res) => {
  const prices = {};
  for (const [role, netCents] of Object.entries(ROLE_PRICES)) {
    const grossCents = Math.round(netCents * (1 + VAT_RATE));
    prices[role] = {
      net: netCents / 100,
      gross: grossCents / 100,
      vat: (grossCents - netCents) / 100,
      currency: 'EUR'
    };
  }

  // Add-On Preise berechnen
  const addons = {};
  for (const [key, addon] of Object.entries(ADDON_PRODUCTS)) {
    const grossCents = Math.round(addon.price_net_cents * (1 + VAT_RATE));
    addons[key] = {
      ...addon,
      price: {
        net: addon.price_net_cents / 100,
        gross: grossCents / 100,
        vat: (grossCents - addon.price_net_cents) / 100,
        currency: 'EUR'
      }
    };
  }

  res.json({
    success: true,
    data: {
      prices,
      addons,
      vat_rate: VAT_RATE * 100,
      trial_days: TRIAL_DAYS
    }
  });
};

/**
 * POST /api/subscription/create-checkout - Stripe Checkout Session erstellen
 */
const createCheckoutSession = async (req, res) => {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        error: 'Zahlungssystem nicht konfiguriert. Bitte kontaktieren Sie den Support.'
      });
    }

    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const price = getPriceForRole(user.role);
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';

    // Stripe Customer erstellen oder vorhandenen nutzen
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        metadata: { user_id: String(user.id), role: user.role }
      });
      customerId = customer.id;
      await user.update({ stripe_customer_id: customerId });
    }

    const ROLE_LABELS = {
      ADMIN: 'Administrator',
      STANDORTLEITUNG: 'Standortleitung',
      TEAMLEAD: 'Teamleitung',
      BACKOFFICE: 'Backoffice',
      VERTRIEB: 'Vertrieb'
    };

    // Checkout Session erstellen
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit', 'giropay', 'sofort'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Vente CRM - ${ROLE_LABELS[user.role] || 'Standard'}`,
            description: `Monatliches Abonnement inkl. 19% MwSt`
          },
          unit_amount: price.grossCents,
          recurring: { interval: 'month' },
          tax_behavior: 'inclusive'
        },
        quantity: 1
      }],
      success_url: `${baseUrl}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription?status=cancelled`,
      metadata: {
        user_id: String(user.id),
        role: user.role,
        net_amount: String(price.netCents),
        vat_amount: String(price.vatCents)
      },
      locale: 'de',
      allow_promotion_codes: true
    });

    res.json({
      success: true,
      data: { checkout_url: session.url, session_id: session.id }
    });
  } catch (error) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({ success: false, error: 'Checkout konnte nicht erstellt werden' });
  }
};

/**
 * POST /api/subscription/portal - Stripe Kundenportal oeffnen
 */
const createPortalSession = async (req, res) => {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({ success: false, error: 'Zahlungssystem nicht konfiguriert' });
    }

    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id);

    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ success: false, error: 'Kein Abo vorhanden' });
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const session = await stripeClient.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/subscription`
    });

    res.json({ success: true, data: { portal_url: session.url } });
  } catch (error) {
    logger.error('Create portal session error:', error);
    res.status(500).json({ success: false, error: 'Kundenportal konnte nicht geoeffnet werden' });
  }
};

/**
 * POST /api/subscription/webhook - Stripe Webhook Handler
 */
const handleWebhook = async (req, res) => {
  const stripeClient = getStripe();
  if (!stripeClient) {
    return res.status(503).json({ success: false, error: 'Stripe nicht konfiguriert' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ success: false, error: 'Ungueltige Webhook-Signatur' });
  }

  const { User } = req.app.locals.db;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId) {
          const user = await User.findByPk(userId);
          if (user) {
            await user.update({
              subscription_status: 'ACTIVE',
              stripe_subscription_id: session.subscription,
              subscription_started_at: new Date(),
              subscription_ends_at: null
            });
            logger.info(`Subscription activated for user ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripeClient.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.user_id;
        if (userId) {
          const user = await User.findByPk(userId);
          if (user) {
            const status = subscription.status === 'active' ? 'ACTIVE'
              : subscription.status === 'past_due' ? 'PAST_DUE'
              : subscription.status === 'canceled' ? 'CANCELLED'
              : 'EXPIRED';
            await user.update({
              subscription_status: status,
              subscription_ends_at: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null
            });
            logger.info(`Subscription updated for user ${userId}: ${status}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripeClient.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.user_id;
        if (userId) {
          const user = await User.findByPk(userId);
          if (user) {
            await user.update({
              subscription_status: 'CANCELLED',
              subscription_ends_at: new Date()
            });
            logger.info(`Subscription cancelled for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customer = await stripeClient.customers.retrieve(invoice.customer);
        const userId = customer.metadata?.user_id;
        if (userId) {
          const user = await User.findByPk(userId);
          if (user) {
            await user.update({ subscription_status: 'PAST_DUE' });
            logger.warn(`Payment failed for user ${userId}`);
          }
        }
        break;
      }

      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    logger.error('Webhook handler error:', error);
  }

  res.json({ received: true });
};

/**
 * GET /api/subscription/addons - Add-On Produkte
 */
const getAddons = async (req, res) => {
  const addons = {};
  for (const [key, addon] of Object.entries(ADDON_PRODUCTS)) {
    const grossCents = Math.round(addon.price_net_cents * (1 + VAT_RATE));
    addons[key] = {
      ...addon,
      price: {
        net: addon.price_net_cents / 100,
        gross: grossCents / 100,
        vat: (grossCents - addon.price_net_cents) / 100,
        currency: 'EUR'
      }
    };
  }
  res.json({ success: true, data: addons });
};

/**
 * POST /api/subscription/create-addon-checkout - Add-On Stripe Checkout
 */
const createAddonCheckout = async (req, res) => {
  try {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        error: 'Zahlungssystem nicht konfiguriert. Bitte kontaktieren Sie den Support.'
      });
    }

    const { addon_id } = req.body;
    const addon = ADDON_PRODUCTS[addon_id];
    if (!addon) {
      return res.status(400).json({ success: false, error: 'Ungueltiges Add-On' });
    }

    const { User } = req.app.locals.db;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const grossCents = Math.round(addon.price_net_cents * (1 + VAT_RATE));
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';

    // Stripe Customer erstellen oder vorhandenen nutzen
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        metadata: { user_id: String(user.id), role: user.role }
      });
      customerId = customer.id;
      await user.update({ stripe_customer_id: customerId });
    }

    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Vente CRM - ${addon.name}`,
            description: addon.description
          },
          unit_amount: grossCents,
          recurring: { interval: addon.interval },
          tax_behavior: 'inclusive'
        },
        quantity: 1
      }],
      success_url: `${baseUrl}/subscription?status=addon_success&addon=${addon_id}`,
      cancel_url: `${baseUrl}/subscription?status=addon_cancelled`,
      metadata: {
        user_id: String(user.id),
        addon_id,
        type: 'ADDON',
        net_amount: String(addon.price_net_cents)
      },
      locale: 'de'
    });

    res.json({
      success: true,
      data: { checkout_url: session.url, session_id: session.id }
    });
  } catch (error) {
    logger.error('Create addon checkout error:', error);
    res.status(500).json({ success: false, error: 'Add-On Checkout konnte nicht erstellt werden' });
  }
};

module.exports = {
  getSubscriptionStatus,
  getPrices,
  getAddons,
  createCheckoutSession,
  createAddonCheckout,
  createPortalSession,
  handleWebhook,
  ROLE_PRICES,
  ADDON_PRODUCTS,
  VAT_RATE,
  TRIAL_DAYS,
  getPriceForRole
};
