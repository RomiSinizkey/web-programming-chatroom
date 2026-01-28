// routes/index.js
const express = require('express');
const router = express.Router();

router.use('/', require('./auth')); // routes/auth/index.js
router.use('/', require('./chatroom/chatroom'));
router.use('/', require('./messages'));

router.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    return res.status(204).end();
});

module.exports = router;
