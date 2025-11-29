const { User } = require('../models');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const csv = require('csv-parser');

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

exports.importClients = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  let importedCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Clean up file
      try {
        if (fs.existsSync(req.file.path)) {
             fs.unlinkSync(req.file.path);
        }
      } catch (cleanupErr) {
        console.error('Error cleaning up file:', cleanupErr);
      }

      for (const row of results) {
        // Case-insensitive key lookup
        const findKey = (obj, key) => Object.keys(obj).find(k => k.toLowerCase().trim() === key.toLowerCase());
        
        const nameKey = findKey(row, 'name');
        const emailKey = findKey(row, 'email');
        const phoneKey = findKey(row, 'phone');

        const name = nameKey ? row[nameKey] : null;
        const email = emailKey ? row[emailKey] : null;
        const phone = phoneKey ? row[phoneKey] : null;

        if (!name || !email) {
          console.log('Skipping row missing name or email:', row);
          errors.push(`Skipped row: Missing Name or Email`);
          continue;
        }

        try {
            const normalizedEmail = email.toLowerCase().trim();
            const existingUser = await User.findOne({ where: { email: normalizedEmail } });
            
            if (!existingUser) {
                await User.create({
                    name,
                    email: normalizedEmail,
                    phone: phone || null,
                    role: 'client',
                    password_hash: null 
                });
                importedCount++;
            } else {
                errors.push(`Skipped ${email}: User already exists`);
            }
        } catch (err) {
            errors.push(`Failed to import ${email}: ${err.message}`);
        }
      }

      res.json({ 
        message: 'Import processed', 
        importedCount, 
        totalRows: results.length,
        errors 
      });
    })
    .on('error', (error) => {
      res.status(500).json({ message: 'Error parsing CSV', error: error.message });
    });
};
