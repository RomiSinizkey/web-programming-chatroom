// routes/auth/register.js
const express = require("express");
const router = express.Router();

const auth = require("../../controllers/auth");

router.get("/register", auth.getRegister);
router.post("/register", auth.postRegister);

module.exports = router;
