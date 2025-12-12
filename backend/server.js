require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

// CORS - Cho phép Frontend kết nối
app.use(cors({
  origin: '*', // Cho phép tất cả trong Docker
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Request logging
app.use((req, res, next) => {
  console.log(`\n📥 ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// ROUTES
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const notificationRoutes = require('./routes/notification.routes');
const personalAIRoutes = require('./routes/personal-ai.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const aiRoutes = require('./routes/ai.routes');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/personal-ai', personalAIRoutes);
app.use('/api/user', userRoutes);
app.use('/uploads', express.static('uploads'));

// 404 Handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.path);
  res.status(404).json({
    success: false,
    message: 'API endpoint không tồn tại',
    path: req.path
  });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

const PORT = process.env.PORT || 3000;

// ⭐ QUAN TRỌNG: Listen trên 0.0.0.0 để Docker có thể truy cập
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://192.168.71.106:${PORT}/api`);
  console.log(`🏥 Health check: http://192.168.71.106:${PORT}/health`);
  console.log(`\n✅ Backend ready!\n`);
});

module.exports = app;