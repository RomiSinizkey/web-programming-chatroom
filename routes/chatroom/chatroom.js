// routes/chatroom/chatroom.js
const express = require('express');
const router = express.Router();

const { requireLogin } = require('../../middleware/auth');
const chat = require('../../controllers/chatroom');

router.get('/chat', requireLogin, chat.getChat);

module.exports = router;
