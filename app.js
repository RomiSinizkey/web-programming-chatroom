const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');

const app = express();

// ====== CONSTS for Part A ======
const TIMEOUT_REGISTER = 30 * 1000; // 30 seconds

// In-memory users list (Part A only, no DB yet)
const users = []; // { email, firstName, lastName, password }

// ====== view engine setup ======
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ====== middlewares ======
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
    secret: 'dev-secret-change-later',
    resave: false,
    saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, 'public')));

// ====== ROUTES (Part A) ======

// GET /  -> login page
app.get('/', (req, res) => {
    const msg = req.query.msg || null; // show "you are registered" after redirect
    res.render('login', { message: msg });
});

app.post('/login', (req, res) => {
    return res.redirect('/?msg=' + encodeURIComponent('Login will be implemented in Part B'));
});


// GET /register -> step 1 page
app.get('/register', (req, res) => {
    const data = req.cookies.registerData || {};
    const error = req.query.err || null;
    res.render('register_step1', { data, error });
});

// POST /register -> validate + save cookie + go to step2
app.post('/register', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const firstName = (req.body.firstName || '').trim().toLowerCase();
    const lastName = (req.body.lastName || '').trim().toLowerCase();

    // basic validation (server side)
    if (!email || !firstName || !lastName) {
        return res.redirect('/register?err=' + encodeURIComponent('All fields are required'));
    }

    // check if email already used
    const exists = users.some(u => u.email.toLowerCase() === email);
    if (exists) {
        return res.redirect('/register?err=' + encodeURIComponent('this email is already in use, please choose another one'));
    }

    // save cookie for 30 seconds from NOW (step2 start moment requirement)
    res.cookie('registerData', {
        email,
        firstName,
        lastName,
        createdAt: Date.now()
    }, { maxAge: TIMEOUT_REGISTER });

    return res.redirect('/register/password');
});

// GET /register/password -> step 2 page
app.get('/register/password', (req, res) => {
    const data = req.cookies.registerData;
    const error = req.query.err || null;

    if (!data) return res.redirect('/register'); // no cookie -> back to step1

    // timeout check
    if (Date.now() - (data.createdAt || 0) > TIMEOUT_REGISTER) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('Registration timed out, please start again'));
    }

    res.render('register_step2', { data, error });
});

// POST /register/password -> finish registration
app.post('/register/password', (req, res) => {
    const data = req.cookies.registerData;
    const pass1 = (req.body.password || '').trim().toLowerCase();
    const pass2 = (req.body.password2 || '').trim().toLowerCase();

    if (!data) return res.redirect('/register');

    // timeout check (again)
    if (Date.now() - (data.createdAt || 0) > TIMEOUT_REGISTER) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('Registration timed out, please start again'));
    }

    if (!pass1 || !pass2) {
        return res.redirect('/register/password?err=' + encodeURIComponent('Password is required'));
    }
    if (pass1 !== pass2) {
        return res.redirect('/register/password?err=' + encodeURIComponent('Passwords do not match'));
    }

    // IMPORTANT: check email again right before inserting (simulates concurrent registration requirement)
    const exists = users.some(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('this email is already in use, please choose another one'));
    }

    // create user
    users.push({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: pass1,
    });

    // clear cookie after successful registration
    res.clearCookie('registerData');

    // back to login with message
    return res.redirect('/?msg=' + encodeURIComponent('you are registered'));
});

// ====== catch 404 and forward to error handler ======
app.use(function(req, res, next) {
    next(createError(404));
});

// ====== error handler ======
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
