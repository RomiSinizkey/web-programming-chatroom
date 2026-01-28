// routes/auth.routes.js
const express = require('express');
const router = express.Router();

const auth = require('../controllers/auth');

const register = require('../controllers/register');

// Login page
router.get('/', auth.getRoot);

// Login action
router.post('/login', auth.postLogin);

// Register (2 steps, same URL)
router.get('/register', register.getRegister);
router.post('/register', register.postRegister);

// Logout
router.get('/logout', auth.getLogout);

module.exports = router;