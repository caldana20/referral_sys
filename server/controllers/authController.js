const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Tenant, PasswordResetToken } = require('../models');
const { sendEmail } = require('../utils/emailService');
const { resolveTenantSender } = require('./senderController');
const { buildTenantBaseUrl } = require('./referralController');
const { resolveEmailTemplate } = require('../utils/emailTemplates');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password, tenantSlug } = req.body;

  try {
    const normalizedSlug = (tenantSlug || '').toString().trim().toLowerCase();
    const tenant = normalizedSlug
      ? await Tenant.findOne({ where: { slug: normalizedSlug } })
      : req.tenant?.tenantId
        ? await Tenant.findByPk(req.tenant.tenantId)
        : null;
    if (!tenant) return res.status(401).json({ message: 'Invalid tenant' });
    if (tenant.deletedAt || tenant.isActive === false) {
      return res.status(403).json({ message: 'Tenant is deactivated' });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ where: { email: normalizedEmail, tenantId: tenant.id } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, tenantId: tenant.id, tenantSlug: tenant.slug },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.superLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail, role: 'super_admin' } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, tenantId: user.tenantId || null },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '2h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || undefined
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTenantOptions = async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const users = await User.findAll({
      where: { email: normalizedEmail, role: 'admin' },
      include: [{ model: Tenant }]
    });

    if (!users || users.length === 0) {
      return res.json({ tenants: [] });
    }

    const uniqueTenants = new Map();
    users.forEach((user) => {
      if (user.tenantId && user.Tenant) {
        uniqueTenants.set(user.tenantId, user.Tenant);
      }
    });

    const tenants = [];
    for (const tenant of Array.from(uniqueTenants.values())) {
      try {
        const baseUrl = await buildTenantBaseUrl(tenant.id);
        tenants.push({
          tenantId: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          baseUrl
        });
      } catch (err) {
        console.warn('Skipping tenant in lookup due to invalid URL data:', {
          tenantId: tenant.id,
          error: err?.message
        });
      }
    }

    return res.json({ tenants });
  } catch (error) {
    console.error('getTenantOptions error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getResetExpiry() {
  const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60);
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
  return new Date(Date.now() + safeMinutes * 60 * 1000);
}

function getMinPasswordLength() {
  const length = Number(process.env.PASSWORD_MIN_LENGTH || 8);
  return Number.isFinite(length) && length >= 6 ? length : 8;
}

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body || {};
  if (!req.tenant || !req.tenant.tenantId) {
    return res.status(400).json({ message: 'Unable to resolve tenant from host' });
  }

  try {
    const tenant = await Tenant.findByPk(req.tenant.tenantId);
    if (!tenant) {
      return res.status(400).json({ message: 'Invalid tenant' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail, tenantId: tenant.id } });
    if (!user) {
      return res.json({ message: 'If an account exists, you will receive a reset email shortly.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = getResetExpiry();

    await PasswordResetToken.update(
      { usedAt: new Date() },
      { where: { userId: user.id, usedAt: null } }
    );

    await PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    const tenantSender = await resolveTenantSender(tenant.id);
    const fromEmail = tenantSender?.fromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
    const fromName = tenantSender?.fromName || tenant.name || 'Your Company';

    if (fromEmail) {
      const baseUrl = await buildTenantBaseUrl(tenant.id);
      const resetLink = `${baseUrl}/admin/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
      const template = await resolveEmailTemplate(tenant.id, 'password_reset', {
        companyName: tenant.name || 'Your Company',
        resetLink
      });

      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        fromEmail,
        fromName
      });
    } else {
      console.warn('Password reset email skipped: sender not configured.');
    }

    return res.json({ message: 'If an account exists, you will receive a reset email shortly.' });
  } catch (error) {
    console.error('requestPasswordReset error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, token, password } = req.body || {};
  if (!req.tenant || !req.tenant.tenantId) {
    return res.status(400).json({ message: 'Unable to resolve tenant from host' });
  }

  try {
    const tenant = await Tenant.findByPk(req.tenant.tenantId);
    if (!tenant) {
      return res.status(400).json({ message: 'Invalid tenant' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !token || !password) {
      return res.status(400).json({ message: 'Email, token, and password are required' });
    }
    const minLength = getMinPasswordLength();
    if (password.length < minLength) {
      return res.status(400).json({ message: `Password must be at least ${minLength} characters` });
    }

    const user = await User.findOne({ where: { email: normalizedEmail, tenantId: tenant.id } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid reset request' });
    }

    const tokenHash = hashResetToken(token);
    const record = await PasswordResetToken.findOne({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null
      }
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    const newHash = await bcrypt.hash(password, 10);
    user.password_hash = newHash;
    await user.save();

    record.usedAt = new Date();
    await record.save();

    await PasswordResetToken.update(
      { usedAt: new Date() },
      { where: { userId: user.id, usedAt: null } }
    );

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    const minLength = getMinPasswordLength();
    if (newPassword.length < minLength) {
      return res.status(400).json({ message: `Password must be at least ${minLength} characters` });
    }

    const user = await User.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.password_hash) {
      return res.status(400).json({ message: 'Password not set. Use the reset password flow.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

