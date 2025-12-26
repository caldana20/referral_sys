const { Tenant, TenantHost } = require('../models');

let cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getHost(req) {
  // Prefer explicit tenant host header when API is on a different host/port
  const headerHost = req.headers['x-tenant-host'];
  if (headerHost && typeof headerHost === 'string') {
    return headerHost.split(":")[0].toLowerCase();
  }
  const host = req.headers.host || "";
  // Strip port if present
  return host.split(":")[0].toLowerCase();
}

async function resolveHost(host) {
  const now = Date.now();
  const cached = cache.get(host);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  const record = await TenantHost.findOne({
    where: { host },
    include: [{ model: Tenant }]
  });

  if (!record || !record.Tenant) {
    cache.delete(host);
    return null;
  }

  const data = {
    tenantId: record.tenantId,
    tenantSlug: record.Tenant.slug,
    tenantName: record.Tenant.name
  };
  cache.set(host, { data, expires: now + CACHE_TTL_MS });
  return data;
}

function tenantHostResolver() {
  return async function (req, res, next) {
    const host = getHost(req);
    if (!host) return res.status(400).json({ message: 'Missing host header' });

    try {
      const context = await resolveHost(host);
      if (context) {
        req.tenant = context;
        return next();
      }

      // Dev-friendly fallback: localhost or unknown host -> try default or first tenant
      const fallbackSlug = process.env.DEFAULT_TENANT_SLUG || 'default';
      let fallback = await Tenant.findOne({ where: { slug: fallbackSlug } });
      if (!fallback) {
        fallback = await Tenant.findOne({ order: [['id', 'ASC']] });
      }

      if (fallback) {
        req.tenant = { tenantId: fallback.id, tenantSlug: fallback.slug, tenantName: fallback.name };
        return next();
      }

      return res.status(404).json({ message: 'Unknown tenant host' });
    } catch (err) {
      console.error('Tenant host resolution failed', err);
      res.status(500).json({ message: 'Failed to resolve tenant host' });
    }
  };
}

module.exports = tenantHostResolver;

