// routes/auth/login.js
const express = require('express');
const router = express.Router();

const auth = require('../../controllers/auth');

router.get('/', auth.getRoot);
router.post('/login', auth.postLogin);
router.get('/logout', auth.getLogout);

module.exports = router;
