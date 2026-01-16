const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const { initDb, User, Message } = require('./models');

const app = express();

initDb().catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
});

// ====== CONSTS for Part A ======
const TIMEOUT_REGISTER = 30 * 1000; // 30 seconds

// ====== Validation rules ======
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// ✅ per requirements: letters only, 3-32
const nameRegex = /^[A-Za-z]{3,32}$/;

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
    if (req.session.user) {
        return res.redirect('/chat');
    }
    const msg = req.query.msg || null;
    res.render('login', { message: msg });
});

app.post('/login', async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const password = (req.body.password || '').trim();

        const user = await User.findByPk(email);

        if (!user) {
            return res.redirect('/?msg=' + encodeURIComponent('User does not exist'));
        }

        if (user.password !== password) {
            return res.redirect('/?msg=' + encodeURIComponent('Incorrect password'));
        }

        req.session.user = {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        };

        return res.redirect('/chat');
    } catch (err) {
        return next(err);
    }
});


app.get('/chat', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
    }
    res.render('chat', { user: req.session.user });
});

// GET /register -> step 1 page (same view file)
app.get('/register', (req, res) => {
    const data = req.cookies.registerData || {};
    const error = req.query.err || null;

    res.render('register', { step: 1, data, error });
});

// POST /register -> validate + save cookie + go to step2
app.post('/register', async (req, res, next) => {
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
        return res.redirect('/register?err=' + encodeURIComponent('Name must contain only letters and be 3-32 characters'));
    }

    // check if email already used
    const exists = await User.findByPk(email);
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

// GET /register/password -> step 2 page (same view file)
app.get('/register/password', (req, res) => {
    const data = req.cookies.registerData;
    const error = req.query.err || null;

    if (!data) return res.redirect('/register'); // no cookie -> back to step1

    // timeout check
    if (Date.now() - (data.createdAt || 0) > TIMEOUT_REGISTER) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('Registration timed out, please start again'));
    }

    res.render('register', { step: 2, data, error });
});

// POST /register/password -> finish registration
app.post('/register/password', async (req, res, next) => {
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
        return res.redirect('/register/password?err=' + encodeURIComponent('Password must be between 3 and 32 characters'));
    }

    const exists = await User.findByPk((data.email || '').toLowerCase());
    if (exists) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('this email is already in use, please choose another one'));
    }


    // create user
    await User.create({
        email: (data.email || '').toLowerCase(),
        firstName: (data.firstName || '').toLowerCase(),
        lastName: (data.lastName || '').toLowerCase(),
        password: pass1,
    });

    // clear cookie after successful registration
    res.clearCookie('registerData');

    // back to login with message
    return res.redirect('/?msg=' + encodeURIComponent('you are registered'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        return res.redirect('/?msg=' + encodeURIComponent('Logged out'));
    });
});


// ====== ROUTES (Part B) ======

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    next();
}


// GET messages (latest 50)
app.get("/api/messages", requireAuth, async (req, res, next) => {
    try {
        const limit = 50;

        const messages = await Message.findAll({
            order: [["createdAt", "DESC"]],
            limit,
        });

        // return ascending so UI prints in correct order
        res.json(messages.reverse());
    } catch (err) {
        next(err);
    }
});

// POST new message
app.post("/api/messages", requireAuth, async (req, res, next) => {
    try {
        const text = (req.body.text || "").trim();

        if (!text) {
            return res.status(400).json({ error: "Message text is required" });
        }
        if (text.length > 500) {
            return res.status(400).json({ error: "Message too long (max 500)" });
        }

        const msg = await Message.create({
            text,
            userEmail: req.session.user.email,
        });

        res.status(201).json(msg);
    } catch (err) {
        next(err);
    }
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
