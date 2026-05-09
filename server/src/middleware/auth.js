const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/httpError');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing Authorization header'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    return next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

module.exports = { requireAuth };
