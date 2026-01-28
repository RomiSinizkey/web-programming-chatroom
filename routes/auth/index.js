// routes/auth/index.js
const express = require('express');
const router = express.Router();

router.use('/', require('./login'));
router.use('/', require('./register'));

module.exports = router;
