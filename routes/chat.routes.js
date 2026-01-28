// routes/chat.routes.js
const express = require('express');
const router = express.Router();

const { requireLogin } = require('../middleware/auth');
const messages = require('../controllers/messages.view');

// Chat page (protected)
router.get('/chat', requireLogin, messages.getChat);

module.exports = router;