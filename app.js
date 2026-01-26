// app.js
// @ts-check

const BCRYPT_ROUNDS = 10;

// JSDoc typedefs for better IntelliSense/type checking in editors (no runtime impact).
/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */
/** @typedef {import('express').RequestHandler} RequestHandler */
/** @typedef {import('express').ErrorRequestHandler} ErrorRequestHandler */

// Import core libraries and middleware: logging, cookies, sessions, hashing, and DB utilities
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// Load DB initialization and Sequelize models
const { initDb, User, Message } = require('./models');

const app = express();

initDb().catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
});

// ====== CONSTS =======
const TIMEOUT_REGISTER = 30 * 1000; // 30 seconds
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // xxx@xxx.xxx
const nameRegex = /^[A-Za-z]{3,32}$/;//xxx size between 3-32


// Safely read the "registerData" cookie
function getRegisterData(req) {
    const data = req.cookies && req.cookies.registerData ? req.cookies.registerData : null;
    return data && typeof data === 'object' ? data : null;
}

// ====== view engine setup ======
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ====== middlewares ======
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev-secret-change-later',
        resave: false,
        saveUninitialized: false,
        // optional but nice:
        // cookie: { sameSite: 'lax' },
    })
);
app.use(express.static(path.join(__dirname, 'public')));

// ====== ROUTES (Part A) ======

// GET / -> login page
/** @type {RequestHandler} */
const rootHandler = (req, res) => {
    if (req.session.user) {
        return res.redirect('/chat');
    }
    const msg = req.query.msg || null;
    return res.render('login', { message: msg });
};
// Home route: show login page for guests; redirect logged-in users to /chat.
app.get('/', rootHandler);

/** @type {RequestHandler} */
const loginHandler = async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '').trim();

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
};
// Login handler: validate user credentials and store minimal user profile in the session.
app.post('/login', loginHandler);

/** @type {RequestHandler} */
const chatHandler = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
    }
    return res.render('chat', { user: req.session.user });
};
// Chat page: requires an active session; otherwise redirects back to login.
app.get('/chat', chatHandler);

// GET /register -> step 1
/** @type {RequestHandler} */
const registerStep1 = (req, res) => {
    const data = getRegisterData(req) || {};
    const error = req.query.err || null;
    return res.render('register', { step: 1, data, error });
};
// Registration step 1: show basic user details form: email + first +last name
app.get('/register', registerStep1);

// POST /register -> validate + save cookie + go to step2
/** @type {RequestHandler} */
const registerStep1Post = async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const firstName = String(req.body.firstName || '').trim();
        const lastName = String(req.body.lastName || '').trim();

        if (!email || !firstName || !lastName) {
            return res.redirect('/register?err=' + encodeURIComponent('All fields are required'));
        }
        if (!emailRegex.test(email)) {
            return res.redirect('/register?err=' + encodeURIComponent('Invalid email format'));
        }
        if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
            return res.redirect(
                '/register?err=' +
                encodeURIComponent('Name must contain only letters and be 3-32 characters')
            );
        }

        const exists = await User.findByPk(email);
        if (exists) {
            return res.redirect(
                '/register?err=' + encodeURIComponent('this email is already in use, please choose another one')
            );
        }

        res.cookie(
            'registerData',
            { email, firstName, lastName, createdAt: Date.now() },
            { maxAge: TIMEOUT_REGISTER }
        );

        return res.redirect('/register/password');
    } catch (err) {
        return next(err);
    }
};
// Registration step 1 submit: validate inputs check email uniqueness then store data in a short life cookie.
app.post('/register', registerStep1Post);

// GET /register/password -> step 2
/** @type {RequestHandler} */
const registerStep2 = (req, res) => {
    const data = getRegisterData(req);
    const error = req.query.err || null;

    if (!data) return res.redirect('/register');

    if (Date.now() - (data.createdAt || 0) > TIMEOUT_REGISTER) {
        res.clearCookie('registerData');
        return res.redirect('/register?err=' + encodeURIComponent('Registration timed out, please start again'));
    }

    return res.render('register', { step: 2, data, error });
};
// Registration step 2: requires registerData cookie and enforces a 30 seconds timeout.
app.get('/register/password', registerStep2);

/** @type {RequestHandler} */
const registerStep2Post = async (req, res, next) => {
    try {
        const data = getRegisterData(req);
        const pass1 = String(req.body.password || '').trim();
        const pass2 = String(req.body.password2 || '').trim();

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
            return res.redirect(
                '/register/password?err=' + encodeURIComponent('Password must be between 3 and 32 characters')
            );
        }

        const exists = await User.findByPk(String(data.email || '').toLowerCase());
        if (exists) {
            res.clearCookie('registerData');
            return res.redirect(
                '/register?err=' + encodeURIComponent('this email is already in use, please choose another one')
            );
        }

        const hashed = await bcrypt.hash(pass1, BCRYPT_ROUNDS);

        await User.create({
            email: String(data.email || '').toLowerCase(),
            firstName: String(data.firstName || '').toLowerCase(),
            lastName: String(data.lastName || '').toLowerCase(),
            password: hashed,
        });

        res.clearCookie('registerData');
        return res.redirect('/?msg=' + encodeURIComponent('you are registered'));
    } catch (err) {
        return next(err);
    }
};
// Registration finish: validate passwords hash with bcrypt create the user in DB then clear registerData cookie
app.post('/register/password', registerStep2Post);

/** @type {RequestHandler} */
const logoutHandler = (req, res) => {
    // clear cookie + destroy session
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // default cookie name of express-session
        return res.redirect('/?msg=' + encodeURIComponent('Logged out'));
    });
};
// Logout: destroy the session and clear the session cookie.
app.get('/logout', logoutHandler);

// ====== ROUTES (Part B) ======
// API auth guard: ensures the user has an active session returns 401 JSON if not
/** @type {RequestHandler} */
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    return next();
}

// Fetch latest messages for the chat (includes sender's firstName via JOIN).
app.get('/api/messages', requireAuth, async (req, res, next) => {
    try {
        const limit = 50;
        //Note: if you want to have a Whatsapp like chat, replace all DESC with ASC
        //and remove the note in chat.ejs where "only auto-scroll when not searchin"
        const messages = await Message.findAll({
            include: [{ model: User, attributes: ['firstName'] }],
            order: [['createdAt', 'DESC']],
            limit,
        });

        return res.json(messages);
    } catch (err) {
        return next(err);
    }
});

// Search messages by substring (SQL LIKE). If query is empty, returns regular message list.
app.get('/api/messages/search', requireAuth, async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        const limit = 50;

        if (!q) {
            const messages = await Message.findAll({
                include: [{ model: User, attributes: ['firstName'] }],
                order: [['createdAt', 'DESC']],
                limit,
            });
            return res.json(messages);
        }

        const messages = await Message.findAll({
            where: { text: { [Op.like]: `%${q}%` } },
            include: [{ model: User, attributes: ['firstName'] }],
            order: [['createdAt', 'DESC']],
            limit,
        });

        return res.json(messages);
    } catch (err) {
        return next(err);
    }
});

// Edit a message (owner-only): validates content, checks ownership, then updates text.
app.patch('/api/messages/:id', requireAuth, async (req, res, next) => {
    try {
        const id = req.params.id;
        const text = String(req.body.text || '').trim();

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

// Create a new message via AJAX (returns JSON so the page doesn't refresh).
app.post('/api/messages', requireAuth, async (req, res, next) => {
    try {
        const text = String(req.body.text || '').trim();

        if (!text) return res.status(400).json({ error: 'Message text is required' });
        if (text.length > 500) return res.status(400).json({ error: 'Message too long (max 500)' });

        const msg = await Message.create({ text, userEmail: req.session.user.email });
        return res.json({ ok: true, id: msg.id });
    } catch (err) {
        return next(err);
    }
});

// Fallback form-based message creation (redirects back to /chat).
app.post('/messages', async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
        }

        const text = String(req.body.text || '').trim();
        if (!text || text.length > 500) return res.redirect('/chat');

        await Message.create({ text, userEmail: req.session.user.email });
        return res.redirect('/chat');
    } catch (err) {
        return next(err);
    }
});

// Delete a single message via form (owner only). Uses soft delete (paranoid).
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

// Bulk delete messages (owner-only): validates id list, then deletes matching messages for the current user.
app.post('/api/messages/delete-many', requireAuth, async (req, res, next) => {
    try {
        const ids = req.body.ids;

        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: 'ids must be an array' });
        }

        const cleanIds = ids
            .map((x) => parseInt(String(x), 10))
            .filter((n) => Number.isInteger(n) && n > 0);

        if (cleanIds.length === 0) {
            return res.status(400).json({ error: 'No valid ids provided' });
        }

        await Message.destroy({
            where: { id: cleanIds, userEmail: req.session.user.email },
        });

        return res.json({ ok: true, deleted: cleanIds.length });
    } catch (err) {
        return next(err);
    }
});

// Ignore Chrome DevTools auto-request to reduce noisy 404 logs.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    return res.status(204).end();
});

// Catch-all 404: forward to the error handler.
/** @type {RequestHandler} */
const notFound = (req, res, next) => next(createError(404));
app.use(notFound);

// Central error handler: renders the error page (shows stack only in development).
/** @type {ErrorRequestHandler} */
const errorHandler = (err, req, res, _next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
};
app.use(errorHandler);
// Export the app for bin/www (server startup entry point).
module.exports = app;
