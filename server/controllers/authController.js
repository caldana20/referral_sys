const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Tenant } = require('../models');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // tenant context derived from host resolver
    if (!req.tenant || !req.tenant.tenantId) {
      return res.status(400).json({ message: 'Unable to resolve tenant from host' });
    }
    const tenant = await Tenant.findByPk(req.tenant.tenantId);
    if (!tenant) return res.status(401).json({ message: 'Invalid tenant' });

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

