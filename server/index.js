const express = require('express');
const cors = require('cors');
const db = require('./models');
const authRoutes = require('./routes/authRoutes');
const referralRoutes = require('./routes/referralRoutes');
const estimateRoutes = require('./routes/estimateRoutes');
const userRoutes = require('./routes/userRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const metaRoutes = require('./routes/metaRoutes');
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
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/meta', metaRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Referral System API');
});

const seedDatabase = async () => {
  try {
    const adminCount = await db.User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password_hash: passwordHash,
        role: 'admin'
      });
      console.log('Default admin created: admin@example.com / admin123');
    }

    const clientCount = await db.User.count({ where: { role: 'client' } });
    if (clientCount === 0) {
      await db.User.create({
        name: 'John Doe',
        email: 'client@example.com',
        role: 'client'
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

