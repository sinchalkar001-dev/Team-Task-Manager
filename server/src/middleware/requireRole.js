const { HttpError } = require('../utils/httpError');

function requireRole(role) {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(new HttpError(401, 'Unauthenticated'));
    if (req.user.role !== role) return next(new HttpError(403, 'Forbidden'));
    return next();
  };
}

module.exports = { requireRole };
