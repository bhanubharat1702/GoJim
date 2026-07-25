// Trigger nodemon restart to load new WhatsApp environment variables
require('dotenv').config();
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Connect to database
connectDB().then(async () => {
  try {
    const Member = require('./models/Member');
    const Lead = require('./models/Lead');
    const Trainer = require('./models/Trainer');
    const Staff = require('./models/Staff');
    const Attendance = require('./models/Attendance');
    
    // Drop all old indexes from the attendances collection
    try {
      await Attendance.collection.dropIndexes();
      console.log('🧹 Attendance index cleanup: dropped all old indexes successfully.');
    } catch (indexErr) {
      console.log('⚠️ Note on Attendance index cleanup:', indexErr.message);
    }
    
    const resMember = await Member.updateMany({}, { $unset: { email: "" } });
    const resLead = await Lead.updateMany({}, { $unset: { email: "" } });
    const resTrainer = await Trainer.updateMany({}, { $unset: { email: "" } });
    const resStaff = await Staff.updateMany({}, { $unset: { email: "" } });
    
    console.log(`🧹 Database Migration: Dropped email field from Member (${resMember.modifiedCount}), Lead (${resLead.modifiedCount}), Trainer (${resTrainer.modifiedCount}), and Staff (${resStaff.modifiedCount}) documents.`);

    // Migrate Member schema for Expected Renewals
    const unmigratedCount = await Member.countDocuments({ membershipStatus: { $exists: false } });
    if (unmigratedCount > 0) {
      console.log(`📦 Found ${unmigratedCount} unmigrated members. Migrating schemas...`);
      const membersToMigrate = await Member.find({ membershipStatus: { $exists: false } });
      for (const m of membersToMigrate) {
        let mappedStatus = 'Active';
        if (m.status === 'inactive') mappedStatus = 'Inactive';
        else if (m.status === 'expired') mappedStatus = 'Expired';
        else if (m.status === 'exited') mappedStatus = 'Exited';

        m.membershipStatus = mappedStatus;
        m.membershipStartDate = m.joinDate || m.createdAt || new Date();
        m.membershipEndDate = m.planExpiry || new Date();
        m.renewalAmount = m.planAmount || 0;
        await m.save();
      }
      console.log('✅ Member schema migration complete.');
    }
    
    // Start background WhatsApp automation checks
    const { startScheduler } = require('./utils/whatsappScheduler');
    startScheduler();

    // Start background owner subscription auto-renewal checks
    const { startSubscriptionScheduler } = require('./utils/subscriptionScheduler');
    startSubscriptionScheduler();
  } catch (err) {
    console.error('❌ Migration / Scheduler failed:', err.message);
  }
}).catch(err => {
  console.error('Database connection failed:', err);
});

const app = express();

// Security middleware
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or postman)
    if (!origin) return callback(null, true);
    
    const cleanFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '';
    
    if (
      allowedOrigins.includes(origin) ||
      (cleanFrontendUrl && origin === cleanFrontendUrl) ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 100, // higher limit in dev mode
  message: { success: false, message: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/trainers', require('./routes/trainerRoutes'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/expense-categories', require('./routes/expenseCategories'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/super-admin', require('./routes/superAdmin'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'GoJim API is running 💪', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🏋️ GoJim API Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 http://localhost:${PORT}/api/health\n`);
});

// Trigger reload for nodemon to update environment variables. (Reloaded for billing cycle update)
