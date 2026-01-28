// routes/messages/index.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../../middleware/auth');
const messages = require('../../controllers/messages');

// API
router.get('/api/messages', requireAuth, messages.getMessages);
router.get('/api/messages/search', requireAuth, messages.searchMessages);
router.patch('/api/messages/:id', requireAuth, messages.patchMessage);
router.post('/api/messages', requireAuth, messages.postMessageApi);
router.post('/api/messages/delete-many', requireAuth, messages.deleteManyApi);

// Form fallbacks
router.post('/messages', messages.postMessageForm);
router.post('/messages/delete', messages.deleteOneForm);

module.exports = router;
