const express = require('express');
const cors = require('cors');
const db = require('./models');
const tenantHostResolver = require('./middleware/tenantHostResolver');
const authRoutes = require('./routes/authRoutes');
const referralRoutes = require('./routes/referralRoutes');
const estimateRoutes = require('./routes/estimateRoutes');
const userRoutes = require('./routes/userRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const groupRoutes = require('./routes/groupRoutes');
const senderRoutes = require('./routes/senderRoutes');
const metaRoutes = require('./routes/metaRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const productRoutes = require('./routes/productRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const billingController = require('./controllers/billingController');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/tenant-logos')) {
  fs.mkdirSync('uploads/tenant-logos', { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow explicit origins and credentials (no wildcard when using credentials)
const allowList = [
  process.env.CLIENT_URL,
  process.env.PUBLIC_SITE_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://default.localhost:3000"
].filter(Boolean);

const suffixes = [
  process.env.CORS_DOMAIN_SUFFIX, // e.g. .tenant.refoza.com
  process.env.HOST_BASE // e.g. localhost or tenant.refoza.com
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const normalized = origin.toLowerCase();
      if (allowList.includes(normalized) || normalized.endsWith(".localhost:3000")) {
        return callback(null, true);
      }
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      const allowedBySuffix = suffixes.some((s) => {
        const clean = s.replace(/^\.+/, "").toLowerCase();
        return host === clean || host.endsWith(`.${clean}`);
      });
      if (allowedBySuffix) return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    } catch (err) {
      return callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Host"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Stripe webhook needs raw body; register before JSON parser
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    req.rawBody = req.body;
    next();
  },
  billingController.handleWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Resolve tenant from host for all API routes (after static)
app.use(tenantHostResolver());

// Debug: log media requests to confirm reachability
app.use('/api/media', (req, _res, next) => {
  console.log('Media request', {
    method: req.method,
    path: req.path,
    host: req.headers.host,
    tenantHost: req.headers['x-tenant-host']
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Referral System API');
});

function buildDefaultClientUrl(slug) {
  const raw = process.env.HOST_BASE || process.env.CLIENT_URL_BASE || process.env.CLIENT_URL || 'http://localhost:3000';
  const withProtocol = raw.startsWith('http') ? raw : `http://${raw}`;
  try {
    const u = new URL(withProtocol);
    const cleanHost = u.hostname.replace(/^\*\./, '').replace(/^\*/, '').replace(/^\.+/, '');
    u.hostname = `${slug}.${cleanHost}`;
    return u.origin;
  } catch {
    return `${withProtocol.replace(/\/$/, '')}/${slug}`;
  }
}

const seedDatabase = async () => {
  try {
    const defaultSlug = process.env.DEFAULT_TENANT_SLUG || 'default';
    let tenant = await db.Tenant.findOne({ where: { slug: defaultSlug } });
    if (!tenant) {
      tenant = await db.Tenant.create({
        name: 'Default Tenant',
        slug: defaultSlug,
        clientUrl: buildDefaultClientUrl(defaultSlug)
      });
      if (process.env.HOST_BASE) {
        const cleanBase = process.env.HOST_BASE.replace(/^\*\./, '').replace(/^\*/, '').replace(/^\.+/, '');
        const host = `${defaultSlug}.${cleanBase}`.toLowerCase();
        await db.TenantHost.findOrCreate({
          where: { host },
          defaults: { tenantId: tenant.id, isPrimary: true, verified: true }
        });
      }
      console.log(`Default tenant created: ${tenant.slug}`);
    }

    const adminCount = await db.User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password_hash: passwordHash,
        role: 'admin',
        tenantId: tenant.id
      });
      console.log('Default admin created: admin@example.com / admin123');
    }

    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
    const superAdminPassword = (process.env.SUPER_ADMIN_PASSWORD || '').trim();
    if (superAdminEmail && superAdminPassword) {
      const existing = await db.User.findOne({ where: { email: superAdminEmail } });
      const passwordHash = await bcrypt.hash(superAdminPassword, 10);
      if (!existing) {
        await db.User.create({
          name: 'Super Admin',
          email: superAdminEmail,
          password_hash: passwordHash,
          role: 'super_admin',
          tenantId: tenant.id
        });
        console.log(`Super admin created: ${superAdminEmail}`);
      } else {
        existing.password_hash = passwordHash;
        existing.role = 'super_admin';
        if (!existing.tenantId) {
          existing.tenantId = tenant.id;
        }
        await existing.save();
        console.log(`Super admin updated: ${superAdminEmail}`);
      }
    }

    const clientCount = await db.User.count({ where: { role: 'client' } });
    if (clientCount === 0) {
      await db.User.create({
        name: 'John Doe',
        email: 'client@example.com',
        role: 'client',
        tenantId: tenant.id
      });
      console.log('Default client created: client@example.com');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

db.sequelize.sync().then(async () => {
  console.log('Database synced');
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync db:', err);
});

