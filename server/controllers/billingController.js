const Stripe = require('stripe');
const { Tenant } = require('../models');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.warn('[billing] STRIPE_SECRET_KEY is not set; billing routes will fail until configured.');
}
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null;

function requireStripe(res) {
  if (!stripe) {
    res.status(500).json({ message: 'Stripe is not configured' });
    return false;
  }
  return true;
}

function resolveBase(req) {
  const protoHeader = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const proto = protoHeader || req.protocol || 'https';
  const host = (req.headers['x-tenant-host'] || req.get('host') || '').toString();
  return { proto, host };
}

function resolveUrl(req, envVar, fallbackPath = '/admin') {
  const { proto, host } = resolveBase(req);
  if (envVar) {
    let url = envVar;
    // If the env has a wildcard like https://*.tenant.refoza.com/..., replace the whole *.domain part with host
    url = url.replace(/\*\.[^/]+/, host);
    // Also handle bare '*' placeholder
    url = url.replace('*', host);
    if (url.startsWith('http')) return url;
    return `${proto}://${host}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return `${proto}://${host}${fallbackPath}`;
}

exports.createCheckoutSession = async (req, res) => {
  if (!requireStripe(res)) return;
  const tenantId = req.user?.tenantId || req.tenant?.tenantId;
  const priceId = req.body?.priceId || process.env.STRIPE_PRICE_ID;

  if (!tenantId) return res.status(400).json({ message: 'Tenant context is required' });
  if (!priceId) return res.status(400).json({ message: 'Stripe priceId is required' });

  try {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email || undefined,
        name: tenant.name || undefined,
        metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
      });
      customerId = customer.id;
      tenant.stripeCustomerId = customerId;
      await tenant.save();
    }

    const successUrl = resolveUrl(req, process.env.STRIPE_SUCCESS_URL);
    const cancelUrl = resolveUrl(req, process.env.STRIPE_CANCEL_URL);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: { enabled: process.env.STRIPE_TAX_ENABLED === 'true' },
      metadata: {
        tenantId: String(tenant.id),
        tenantSlug: tenant.slug,
        priceId
      },
      subscription_data: {
        metadata: {
          tenantId: String(tenant.id),
          tenantSlug: tenant.slug,
          priceId
        },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ message: 'Failed to create checkout session', error: err.message });
  }
};

exports.createPortalSession = async (req, res) => {
  if (!requireStripe(res)) return;
  const tenantId = req.user?.tenantId || req.tenant?.tenantId;
  if (!tenantId) return res.status(400).json({ message: 'Tenant context is required' });

  try {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (!tenant.stripeCustomerId) {
      return res.status(400).json({ message: 'No Stripe customer for this tenant yet' });
    }

    const returnUrl = resolveUrl(req, process.env.STRIPE_PORTAL_RETURN_URL);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    res.status(500).json({ message: 'Failed to create portal session', error: err.message });
  }
};

exports.handleWebhook = async (req, res) => {
  if (!requireStripe(res)) return;
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ message: 'Stripe webhook secret is not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        if (tenantId && session.subscription) {
          const tenant = await Tenant.findByPk(tenantId);
          if (tenant) {
            tenant.stripeCustomerId = session.customer;
            tenant.stripeSubscriptionId = session.subscription;
            tenant.stripePriceId =
              session.line_items?.data?.[0]?.price?.id ||
              session.metadata?.priceId ||
              tenant.stripePriceId;
            tenant.subscriptionStatus = 'active';
            await tenant.save();
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const tenant =
          (sub.metadata?.tenantId && (await Tenant.findByPk(sub.metadata.tenantId))) ||
          (await Tenant.findOne({ where: { stripeSubscriptionId: sub.id } })) ||
          (await Tenant.findOne({ where: { stripeCustomerId: sub.customer } }));
        if (tenant) {
          tenant.stripeSubscriptionId = sub.id;
          tenant.stripeCustomerId = sub.customer;
          tenant.stripePriceId = sub.items?.data?.[0]?.price?.id || tenant.stripePriceId;
          tenant.subscriptionStatus = sub.status;
          tenant.subscriptionCurrentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null;
          await tenant.save();
        }
        break;
      }
      default:
        // ignore others
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handling error:', err);
    return res.status(500).json({ message: 'Webhook handling failed', error: err.message });
  }

  res.json({ received: true });
};

