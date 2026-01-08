const express = require('express');
const path = require('path');
// const cors = require('cors');

// const corsConfig = require('./config/cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const registerRoutes = require('./routes');

const app = express();

// app.use(corsConfig);

// app.use(cors({
//     origin: [
//         'http://localhost:5173'
//     ],
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
// }));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(requestLogger);

registerRoutes(app);

app.use(errorHandler);

module.exports = app;
