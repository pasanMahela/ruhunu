require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const items = require('./routes/items');
const cartRoutes = require('./routes/cart');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customers');
const logsRoutes = require('./routes/logs');
const analyticsRoutes = require('./routes/analytics');
const emailSubscriptionRoutes = require('./routes/emailSubscriptions');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ruhunu-pos.onrender.com']
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB successfully');
  console.log('Database:', process.env.MONGODB_URI);
  
  // Initialize email scheduler after database connection
  const emailScheduler = require('./services/emailScheduler');
  await emailScheduler.initialize();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Add mongoose connection event listeners
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/items', items);
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', cartRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/item-balance', require('./routes/itemBalance'));
app.use('/api/logs', logsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email-subscriptions', emailSubscriptionRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 