// controllers/messages.view.js
// @ts-check

const { Message } = require('../models');

async function getChat(req, res) {
    // requireLogin middleware will ensure session
    return res.render('chat', { user: req.session.user });
}

async function postMessageForm(req, res, next) {
    try {
        if (!req.session.user) {
            return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
        }

        const text = String(req.body.text || '').trim();
        if (!text || text.length > 500) return res.redirect('/chat');

        await Message.create({ text, userEmail: req.session.user.email });
        return res.redirect('/chat');
    } catch (err) {
        return next(err);
    }
}

async function deleteOneForm(req, res, next) {
    try {
        if (!req.session.user) {
            return res.redirect('/?msg=' + encodeURIComponent('Please login first'));
        }

        const id = req.body.id;
        const msg = await Message.findByPk(id);

        if (!msg) return res.redirect('/chat');
        if (msg.userEmail !== req.session.user.email) return res.redirect('/chat');

        await msg.destroy();
        return res.redirect('/chat');
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getChat,
    postMessageForm,
    deleteOneForm,
};
