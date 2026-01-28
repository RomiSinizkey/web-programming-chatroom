// middleware/auth.js
// @ts-check

/**
 * API guard: returns 401 JSON if not logged in
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    return next();
}

/**
 * Page guard: redirects to login if not logged in
 */
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
    }
    return next();
}

module.exports = { requireAuth, requireLogin };
