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

// ====== Validation rules ======
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[A-Za-z]{2,}$/;
const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

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
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    const user = users.find(u => u.email === email);

    if (!user) {
        return res.redirect('/?msg=' + encodeURIComponent('User does not exist'));
    }

    if (user.password !== password) {
        return res.redirect('/?msg=' + encodeURIComponent('Incorrect password'));
    }

    // Login success — prepare for Part B
    req.session.user = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
    };

    return res.redirect('/chat');
});

app.get('/chat', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
    }

    res.render('chat', { user: req.session.user });
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
    if (!emailRegex.test(email)) {
        return res.redirect('/register?err=' + encodeURIComponent('Invalid email format'));
    }

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
        return res.redirect('/register?err=' + encodeURIComponent('Name must contain only letters and be at least 2 characters'));
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
    const pass1 = (req.body.password || '').trim();
    const pass2 = (req.body.password2 || '').trim();


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
    if (pass1.length < 3 || pass1.length > 32) {
        return res.redirect('/register/password?err=' +
            encodeURIComponent('Password must be between 3 and 32 characters'));
    }

    if (!passRegex.test(pass1)) {
        return res.redirect('/register/password?err=' +
            encodeURIComponent('Password must be at least 8 characters and include uppercase, lowercase, number and special character'));
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
