// controllers/error.js
// @ts-check

const createError = require('http-errors');

function notFound(req, res, next) {
    return next(createError(404));
}

function errorHandler(err, req, res, _next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
}

module.exports = { notFound, errorHandler };
