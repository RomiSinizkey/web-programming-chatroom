// controllers/chatroom.js
// @ts-check

function getChat(req, res) {
    // requireLogin middleware will ensure session
    return res.render('chat', { user: req.session.user });
}

module.exports = { getChat };
