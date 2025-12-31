const express = require('express');
const path = require('path');

const corsConfig = require('./config/cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const registerRoutes = require('./routes');

const app = express();

app.use(corsConfig);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(requestLogger);

registerRoutes(app);

app.use(errorHandler);

module.exports = app;
