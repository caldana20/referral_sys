const { User } = require('../models');
const bcrypt = require('bcryptjs');

// Get all users (admins and clients)
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const whereClause = role ? { role } : {};
    
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  console.log('Creating user:', { name, email, role, phone });

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let passwordHash = null;
    
    if (role === 'admin') {
        if (!password) return res.status(400).json({ message: 'Password is required for Admin users' });
        passwordHash = await bcrypt.hash(password, 10);
    } else {
        // Clients: Optional password
        if (password && password.trim() !== '') {
            passwordHash = await bcrypt.hash(password, 10);
        }
    }

    const user = await User.create({
      name,
      email,
      password_hash: passwordHash,
      role: role || 'client',
      phone
    });

    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    console.log('User created:', user.id);
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error creating user', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
