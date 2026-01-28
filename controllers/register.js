// controllers/register.js
const bcrypt = require("bcrypt");
const { User } = require("../models");

const BCRYPT_ROUNDS = 10;
const TIMEOUT_REGISTER = 30 * 1000; // 30 seconds

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[A-Za-z]{3,32}$/;

/* ================= helpers ================= */

function getRegisterData(req) {
    const data = req.cookies?.registerData;
    return data && typeof data === "object" ? data : null;
}

function clearRegisterCookie(res) {
    res.clearCookie("registerData");
}

/* ================= register (single URL) ================= */

/**
 * GET /register
 * - No cookie → Step 1
 * - Cookie exists → Step 2
 * - ?back=1 → Step 1 (cookie kept)
 */
function getRegister(req, res) {
    const data = getRegisterData(req) || {};
    const error = req.query.err || null;
    const back = req.query.back === "1";

    // Back or no data → Step 1
    if (back || !data.email) {
        return res.render("register", { step: 1, data, error });
    }

    // Timeout check
    if (Date.now() - (data.createdAt || 0) > TIMEOUT_REGISTER) {
        clearRegisterCookie(res);
        return res.render("register", {
            step: 1,
            data: {},
            error: "Registration timed out, please start again",
        });
    }

    // Otherwise → Step 2
    return res.render("register", { step: 2, data, error });
}

/**
 * POST /register
 * - step=1 → validate email & names, save cookie
 * - step=2 → validate password & create user
 */
async function postRegister(req, res, next) {
    try {
        const step = String(req.body.step || "1");

        /* ---------- STEP 1 ---------- */
        if (step === "1") {
            const email = String(req.body.email || "").trim().toLowerCase();
            const firstName = String(req.body.firstName || "").trim();
            const lastName = String(req.body.lastName || "").trim();

            if (!email || !firstName || !lastName) {
                return res.redirect("/register?err=" + encodeURIComponent("All fields are required"));
            }

            if (!emailRegex.test(email)) {
                return res.redirect("/register?err=" + encodeURIComponent("Invalid email format"));
            }

            if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
                return res.redirect(
                    "/register?err=" +
                    encodeURIComponent("Names must contain only letters and be 3–32 characters")
                );
            }

            const exists = await User.findByPk(email);
            if (exists) {
                return res.redirect("/register?err=" + encodeURIComponent("This email is already in use"));
            }

            res.cookie(
                "registerData",
                { email, firstName, lastName, createdAt: Date.now() },
                { maxAge: TIMEOUT_REGISTER }
            );

            return res.redirect("/register");
        }

        /* ---------- STEP 2 ---------- */
        const data = getRegisterData(req);
        if (!data) return res.redirect("/register");

        if (Date.now() - data.createdAt > TIMEOUT_REGISTER) {
            clearRegisterCookie(res);
            return res.redirect(
                "/register?err=" + encodeURIComponent("Registration timed out, please start again")
            );
        }

        const p1 = String(req.body.password || "");
        const p2 = String(req.body.password2 || "");

        if (!p1 || !p2) {
            return res.redirect("/register?err=" + encodeURIComponent("Password is required"));
        }

        if (p1 !== p2) {
            return res.redirect("/register?err=" + encodeURIComponent("Passwords do not match"));
        }

        if (p1.length < 3 || p1.length > 32) {
            return res.redirect(
                "/register?err=" + encodeURIComponent("Password must be 3–32 characters")
            );
        }

        const hashed = await bcrypt.hash(p1, BCRYPT_ROUNDS);

        await User.create({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: hashed,
        });

        clearRegisterCookie(res);
        return res.redirect("/?msg=" + encodeURIComponent("You are registered"));
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getRegister,
    postRegister,
};
