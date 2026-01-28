// controllers/messages.js
// @ts-check

const { Op } = require('sequelize');
const { Message, User } = require('../models');

async function getMessages(req, res, next) {
    try {
        const limit = 50;
        const messages = await Message.findAll({
            include: [{ model: User, attributes: ['firstName'] }],
            order: [['createdAt', 'DESC']],
            limit,
        });
        return res.json(messages);
    } catch (err) {
        return next(err);
    }
}

async function searchMessages(req, res, next) {
    try {
        const q = String(req.query.q || '').trim();
        const limit = 50;

        const where = q ? { text: { [Op.like]: `%${q}%` } } : undefined;

        const messages = await Message.findAll({
            where,
            include: [{ model: User, attributes: ['firstName'] }],
            order: [['createdAt', 'DESC']],
            limit,
        });

        return res.json(messages);
    } catch (err) {
        return next(err);
    }
}

async function patchMessage(req, res, next) {
    try {
        const id = req.params.id;
        const text = String(req.body.text || '').trim();

        if (!text) return res.status(400).json({ error: 'Message text is required' });
        if (text.length > 500) return res.status(400).json({ error: 'Message too long (max 500)' });

        const msg = await Message.findByPk(id);
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        if (msg.userEmail !== req.session.user.email) {
            return res.status(403).json({ error: 'Not allowed' });
        }

        msg.text = text;
        await msg.save();

        return res.json({ ok: true });
    } catch (err) {
        return next(err);
    }
}

async function postMessageApi(req, res, next) {
    try {
        const text = String(req.body.text || '').trim();

        if (!text) return res.status(400).json({ error: 'Message text is required' });
        if (text.length > 500) return res.status(400).json({ error: 'Message too long (max 500)' });

        const msg = await Message.create({ text, userEmail: req.session.user.email });
        return res.json({ ok: true, id: msg.id });
    } catch (err) {
        return next(err);
    }
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

async function deleteManyApi(req, res, next) {
    try {
        const ids = req.body.ids;

        if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

        const cleanIds = ids
            .map((x) => parseInt(String(x), 10))
            .filter((n) => Number.isInteger(n) && n > 0);

        if (cleanIds.length === 0) return res.status(400).json({ error: 'No valid ids provided' });

        await Message.destroy({
            where: { id: cleanIds, userEmail: req.session.user.email },
        });

        return res.json({ ok: true, deleted: cleanIds.length });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getMessages,
    searchMessages,
    patchMessage,
    postMessageApi,
    postMessageForm,
    deleteOneForm,
    deleteManyApi,
};
