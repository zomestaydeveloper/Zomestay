const express = require('express');
const path = require('path');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const registerRoutes = require('./routes');

const app = express();


// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Register routes
registerRoutes(app);

// 404 handler (must be after routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Central error handler (last)
app.use(errorHandler);

module.exports = app;
