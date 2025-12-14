const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// CORS Configuration - Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative local port
  'http://127.0.0.1:5173',  // Alternative localhost format
  'http://127.0.0.1:3000',
];

// Helper function to normalize URL (remove trailing slash)
const normalizeOrigin = (url) => {
  if (!url) return null;
  return url.trim().replace(/\/$/, ''); // Remove trailing slash
};

// Add production frontend URL if set
if (process.env.FRONTEND_URL) {
  const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL);
  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

// Add any additional origins from environment variable (comma-separated)
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',')
    .map(origin => normalizeOrigin(origin))
    .filter(origin => origin && !allowedOrigins.includes(origin));
  allowedOrigins.push(...additionalOrigins);
}

// Log allowed origins for debugging
console.log('🌐 CORS Allowed Origins:');
allowedOrigins.forEach(origin => console.log(`   ✅ ${origin}`));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize the incoming origin (remove trailing slash)
    const normalizedOrigin = normalizeOrigin(origin);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      // In development, allow all origins for easier debugging
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log(`⚠️  Allowing origin in dev mode: ${normalizedOrigin}`);
        callback(null, true);
      } else {
        console.log(`❌ Blocked origin: ${normalizedOrigin}`);
        console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error(`Not allowed by CORS. Origin: ${normalizedOrigin}`));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/delivery-challans', require('./routes/deliveryChallans'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/agents', require('./routes/agents'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Medical Service Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Medical Service Management System - Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      customers: '/api/customers',
      invoices: '/api/invoices',
      quotations: '/api/quotations',
      inventory: '/api/inventory',
      accounting: '/api/accounting',
      deliveryChallans: '/api/delivery-challans',
      dashboard: '/api/dashboard',
      agents: '/api/agents',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   API URL: http://localhost:${PORT}/api`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.FRONTEND_URL) {
    console.log(`   Frontend URL (from env): ${process.env.FRONTEND_URL}`);
  }
});

module.exports = app;