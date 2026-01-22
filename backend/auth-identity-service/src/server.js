const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const jwtRoutes = require('./routes/jwt');
const otpRoutes = require('./routes/otp');
const roleRoutes = require('./routes/roles');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Auth Service connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', authRoutes);
app.use('/jwt', jwtRoutes);
app.use('/otp', otpRoutes);
app.use('/roles', roleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-identity-service' });
});

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});