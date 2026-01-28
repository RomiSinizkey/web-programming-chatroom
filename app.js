const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');

const { initDb } = require('./models');
const routes = require('./routes');
const { notFound, errorHandler } = require('./controllers/error');

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

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-later',
    resave: false,
    saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, 'public')));

// mount all routes
app.use(routes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
