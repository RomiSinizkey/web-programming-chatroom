// app.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');

const { initDb } = require('./models');
const { notFound, errorHandler } = require('./controllers/error');

// ✅ NEW: flat routes
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const messagesRoutes = require('./routes/messages.routes');

const app = express();

initDb().catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev-secret-change-later',
        resave: false,
        saveUninitialized: false,
    })
);

app.use(express.static(path.join(__dirname, 'public')));

// ✅ mount routes
app.use(authRoutes);
app.use(chatRoutes);
app.use(messagesRoutes);

// (optional) ignore this chrome devtools request
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    return res.status(204).end();
});

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;