// routes/messages.routes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const messagesApi = require('../controllers/messages.api');
const messagesView = require('../controllers/messages.view');

// --------------------
// API (protected, JSON)
// --------------------
router.get('/api/messages', requireAuth, messagesApi.getMessages);
router.get('/api/messages/search', requireAuth, messagesApi.searchMessages);
router.post('/api/messages', requireAuth, messagesApi.postMessageApi);
router.patch('/api/messages/:id', requireAuth, messagesApi.patchMessage);
router.post('/api/messages/delete-many', requireAuth, messagesApi.deleteManyApi);

// --------------------
// Form routes (EJS)
// --------------------
router.post('/messages', messagesView.postMessageForm);
router.post('/messages/delete', messagesView.deleteOneForm);

module.exports = router;