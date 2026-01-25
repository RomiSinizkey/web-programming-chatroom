const BCRYPT_ROUNDS = 10;
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const { initDb, User, Message } = require('./models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

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
    secret: process.env.SESSION_SECRET || 'dev-secret-change-later',
    resave: false,
    saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, 'public')));

// ====== ROUTES (Part A) ======

// GET / -> login page
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

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
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

// GET /register -> step 1
app.get('/register', (req, res) => {
    const data = req.cookies.registerData || {};
    const error = req.query.err || null;
    res.render('register', { step: 1, data, error });
});

// POST /register -> validate + save cookie + go to step2
app.post('/register', async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const firstName = (req.body.firstName || '').trim().toLowerCase();
        const lastName = (req.body.lastName || '').trim().toLowerCase();

        if (!email || !firstName || !lastName) {
            return res.redirect('/register?err=' + encodeURIComponent('All fields are required'));
        }
        if (!emailRegex.test(email)) {
            return res.redirect('/register?err=' + encodeURIComponent('Invalid email format'));
        }
        if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
            return res.redirect('/register?err=' + encodeURIComponent('Name must contain only letters and be 3-32 characters'));
        }

        const exists = await User.findByPk(email);
        if (exists) {
            return res.redirect('/register?err=' + encodeURIComponent('this email is already in use, please choose another one'));
        }

        // cookie saved for TIMEOUT_REGISTER from NOW (start of step2)
        res.cookie('registerData', {
            email,
            firstName,
            lastName,
            createdAt: Date.now()
        }, { maxAge: TIMEOUT_REGISTER });

        return res.redirect('/register/password');
    } catch (err) {
        return next(err);
    }
});

// GET /register/password -> step 2
app.get('/register/password', (req, res) => {
    const data = req.cookies.registerData;
    const error = req.query.err || null;

    if (!data) return res.redirect('/register');

    if (Date.now() - (data.createdAt || 0) > TIMEOUT_REGISTER) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('Registration timed out, please start again'));
    }

    res.render('register', { step: 2, data, error });
});

// POST /register/password -> finish registration
app.post('/register/password', async (req, res, next) => {
    try {
        const data = req.cookies.registerData;
        const pass1 = (req.body.password || '').trim();
        const pass2 = (req.body.password2 || '').trim();

        if (!data) return res.redirect('/register');

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

        const hashed = await bcrypt.hash(pass1, BCRYPT_ROUNDS);

        await User.create({
            email: (data.email || '').toLowerCase(),
            firstName: (data.firstName || '').toLowerCase(),
            lastName: (data.lastName || '').toLowerCase(),
            password: hashed,
        });

        res.clearCookie('registerData');
        return res.redirect('/?msg=' + encodeURIComponent('you are registered'));
    } catch (err) {
        return next(err);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        return res.redirect('/?msg=' + encodeURIComponent('Logged out'));
    });
});

// ====== ROUTES (Part B) ======

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    next();
}

// GET messages (latest 50) - NEWEST FIRST (DESC)
app.get('/api/messages', requireAuth, async (req, res, next) => {
    try {
        const limit = 50;

        const messages = await Message.findAll({
            include: [{ model: User, attributes: ['firstName'] }],
            order: [['createdAt', 'DESC']],
            limit,
        });

        // ✅ return as-is: newest first (DESC)
        return res.json(messages);
    } catch (err) {
        return next(err);
    }
});

// SEARCH messages in DB (required) - newest first
app.get('/api/messages/search', requireAuth, async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        const limit = 50;

        if (!q) {
            // if empty query -> behave like normal messages
            const messages = await Message.findAll({
                include: [{ model: User, attributes: ['firstName'] }],
                order: [['createdAt', 'DESC']],
                limit,
            });
            return res.json(messages);
        }

        const messages = await Message.findAll({
            where: {
                text: { [Op.like]: `%${q}%` },
            },
            include: [{ model: User, attributes: ['firstName'] }],
            order: [['createdAt', 'DESC']],
            limit,
        });

        return res.json(messages);
    } catch (err) {
        return next(err);
    }
});

// EDIT message (fetch) - only owner
app.patch('/api/messages/:id', requireAuth, async (req, res, next) => {
    try {
        const id = req.params.id;
        const text = (req.body.text || '').trim();

        if (!text) return res.status(400).json({ error: 'Message text is required' });
        if (text.length > 500) return res.status(400).json({ error: 'Message too long (max 500)' });

        const msg = await Message.findByPk(id);
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        if (msg.userEmail !== req.session.user.email) {
            return res.status(403).json({ error: 'Not allowed' });
        }

        msg.text = text;
        await msg.save();

        return res.json({ ok: true });
    } catch (err) {
        return next(err);
    }
});

app.post('/messages', async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
        }

        const text = (req.body.text || '').trim();
        if (!text || text.length > 500) return res.redirect('/chat');

        await Message.create({ text, userEmail: req.session.user.email });
        return res.redirect('/chat');
    } catch (err) {
        return next(err);
    }
});

// DELETE one message (form) - only owner (confirm is done on client)
app.post('/messages/delete', async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
        }

        const id = req.body.id;
        const msg = await Message.findByPk(id);

        if (!msg) return res.redirect('/chat');
        if (msg.userEmail !== req.session.user.email) return res.redirect('/chat');

        await msg.destroy(); // soft delete (paranoid: true)
        return res.redirect('/chat');
    } catch (err) {
        return next(err);
    }
});

// DELETE many (fetch) - only own
app.post('/api/messages/delete-many', requireAuth, async (req, res, next) => {
    try {
        let ids = req.body.ids;

        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: 'ids must be an array' });
        }

        const cleanIds = ids
            .map(x => parseInt(x, 10))
            .filter(n => Number.isInteger(n) && n > 0);

        if (cleanIds.length === 0) {
            return res.status(400).json({ error: 'No valid ids provided' });
        }

        await Message.destroy({
            where: {
                id: cleanIds,
                userEmail: req.session.user.email,
            },
        });

        return res.json({ ok: true, deleted: cleanIds.length });
    } catch (err) {
        return next(err);
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
