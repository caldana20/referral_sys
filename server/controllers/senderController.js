const { Tenant, TenantSender } = require('../models');
const { sendEmail } = require('../utils/emailService');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

function validateEmail(email) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

function resolveAddress(body, tenant) {
  const address = (body?.address || tenant?.address || '').trim();
  const city = (body?.city || tenant?.city || '').trim();
  const state = (body?.state || tenant?.state || '').trim();
  const zip = (body?.zip || tenant?.zip || '').trim();
  const country = (body?.country || tenant?.country || '').trim();

  if (!address || !city || !state || !zip || !country) {
    return null;
  }

  return { address, city, state, zip, country };
}

async function resolveSender(tenantId) {
  if (!tenantId) return null;
  try {
    const record = await TenantSender.findOne({ where: { tenantId, verified: true }, raw: true });
    return record || null;
  } catch (err) {
    console.error('resolveSender failed:', err);
    return null;
  }
}

async function callSendGrid(path, { method = 'GET', body } = {}) {
  console.info('SendGrid request:', { path, method, body: body || null });
  if (!SENDGRID_API_KEY) {
    const err = new Error('SENDGRID_API_KEY not configured');
    err.status = 500;
    throw err;
  }

  const res = await fetch(`https://api.sendgrid.com/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  console.info('SendGrid response:', { path, method, status: res.status, statusText: res.statusText, body: text || null });
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    // ignore parse errors
  }

  if (!res.ok) {
    const err = new Error('SendGrid API error');
    err.status = res.status;
    err.body = json || text;
    throw err;
  }

  return json;
}

exports.createSender = async (req, res) => {
  const tenantId = req.user?.tenantId;
  const { fromName, fromEmail } = req.body || {};

  const trimmedFromName = (fromName || '').trim();
  const trimmedFromEmail = (fromEmail || '').trim();

  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });
  if (!trimmedFromName || !trimmedFromEmail) return res.status(400).json({ message: 'fromName and fromEmail are required' });
  if (!validateEmail(trimmedFromEmail)) return res.status(400).json({ message: 'Invalid email format' });

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

  const address = resolveAddress(req.body, tenant);
  console.info('createSender resolved inputs:', {
    tenantId,
    fromName: trimmedFromName,
    fromEmail: trimmedFromEmail,
    address
  });

  if (!address) {
    return res.status(400).json({
      message: 'Address required: provide address, city, state, zip, country (fill here or in tenant profile).'
    });
  }

  try {
    const payload = {
      nickname: tenant.name || tenant.slug || 'Tenant Sender',
      from: {
        email: trimmedFromEmail,
        name: trimmedFromName
      },
      reply_to: {
        email: trimmedFromEmail,
        name: trimmedFromName
      },
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country
    };

    console.info('createSender payload (pre-SendGrid):', payload);

    const sgResponse = await callSendGrid('/marketing/senders', { method: 'POST', body: payload });
    const senderId = sgResponse?.id?.toString();

    const existing = await TenantSender.findOne({ where: { tenantId } });
    if (existing) {
      await existing.update({
        fromName: trimmedFromName,
        fromEmail: trimmedFromEmail,
        sendgridSenderId: senderId,
        status: 'pending',
        verified: false,
        lastError: null
      });
      return res.json({
        exists: true,
        fromName: trimmedFromName,
        fromEmail: trimmedFromEmail,
        sendgridSenderId: senderId,
        status: 'pending',
        verified: false,
        lastError: null
      });
    }

    await TenantSender.create({
      tenantId,
      fromName: trimmedFromName,
      fromEmail: trimmedFromEmail,
      sendgridSenderId: senderId,
      status: 'pending',
      verified: false
    });

    return res.json({
      exists: true,
      fromName: trimmedFromName,
      fromEmail: trimmedFromEmail,
      sendgridSenderId: senderId,
      status: 'pending',
      verified: false,
      lastError: null
    });
  } catch (err) {
    console.error('createSender failed:', err);
    return res.status(err.status || 500).json({ message: err.body?.errors?.[0]?.message || err.message || 'Failed to create sender' });
  }
};

exports.getSender = async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });

  try {
    const record = await TenantSender.findOne({ where: { tenantId } });
    if (!record) return res.json({ exists: false });

    let verified = record.verified;
    let status = record.status;
    let lastError = record.lastError;

    if (record.sendgridSenderId && SENDGRID_API_KEY) {
      try {
        const sg = await callSendGrid(`/marketing/senders/${record.sendgridSenderId}`);
        verified = !!sg?.verified;
        status = verified ? 'verified' : 'pending';
      } catch (err) {
        console.error('getSender status refresh failed:', err);
        lastError = err.body?.errors?.[0]?.message || err.message;
      }
    }

    await record.update({ verified, status, lastError });

    return res.json({
      exists: true,
      fromName: record.fromName,
      fromEmail: record.fromEmail,
      sendgridSenderId: record.sendgridSenderId,
      status: record.status,
      verified: record.verified,
    lastError: record.lastError
    });
  } catch (err) {
    console.error('getSender failed:', err);
    return res.status(500).json({ message: 'Failed to fetch sender' });
  }
};

exports.sendTestEmail = async (req, res) => {
  const tenantId = req.user?.tenantId;
  const { to } = req.body || {};

  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });
  if (!to || !validateEmail(to)) return res.status(400).json({ message: 'Valid test recipient email is required' });

  try {
    const record = await TenantSender.findOne({ where: { tenantId } });
    if (!record) return res.status(400).json({ message: 'No sender configured' });
    if (!record.verified) return res.status(400).json({ message: 'Sender not verified yet' });

    console.info('sendTestEmail payload:', {
      to,
      subject: 'Test email from your tenant sender',
      fromEmail: record.fromEmail,
      fromName: record.fromName
    });

    const result = await sendEmail({
      to,
      subject: 'Test email from your tenant sender',
      html: `<p>This is a test email from ${record.fromName || 'your sender'}.</p>`,
      tenantId,
      fromEmail: record.fromEmail,
      fromName: record.fromName
    });

    if (!result) {
      return res.status(500).json({ message: 'Failed to send test email' });
    }

    return res.json({ message: 'Test email sent', details: result });
  } catch (err) {
    console.error('sendTestEmail failed:', err);
    return res.status(500).json({ message: 'Failed to send test email' });
  }
};

exports.resetSender = async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });

  try {
    const record = await TenantSender.findOne({ where: { tenantId } });
    if (!record) return res.json({ message: 'No sender configured', exists: false });

    if (record.sendgridSenderId) {
      try {
        console.info('resetSender: deleting SendGrid sender', { tenantId, sendgridSenderId: record.sendgridSenderId });
        await callSendGrid(`/marketing/senders/${record.sendgridSenderId}`, { method: 'DELETE' });
      } catch (err) {
        // Log but continue so the tenant can still reset locally
        console.error('resetSender: failed to delete SendGrid sender', {
          tenantId,
          sendgridSenderId: record.sendgridSenderId,
          error: err?.body || err?.message || err
        });
      }
    }

    await record.destroy();
    return res.json({ message: 'Sender reset; configure a new sender', exists: false });
  } catch (err) {
    console.error('resetSender failed:', err);
    return res.status(500).json({ message: 'Failed to reset sender' });
  }
};

exports.resolveTenantSender = resolveSender;

