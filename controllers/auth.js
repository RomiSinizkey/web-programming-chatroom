// controllers/auth.js
const bcrypt = require("bcrypt");
const { User } = require("../models");

/* ================= login ================= */

function getRoot(req, res) {
    if (req.session.user) return res.redirect("/chat");
    return res.render("login", { message: req.query.msg || null });
}

async function postLogin(req, res, next) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        const user = await User.findByPk(email);
        if (!user) {
            return res.redirect("/?msg=" + encodeURIComponent("User does not exist"));
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.redirect("/?msg=" + encodeURIComponent("Incorrect password"));
        }

        req.session.user = {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        };

        return res.redirect("/chat");
    } catch (err) {
        return next(err);
    }
}

/* ================= logout ================= */

function getLogout(req, res) {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/?msg=" + encodeURIComponent("Logged out"));
    });
}

module.exports = {
    getRoot,
    postLogin,
    getLogout,
};
