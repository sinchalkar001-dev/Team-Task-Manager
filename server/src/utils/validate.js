const { validationResult } = require('express-validator');
const { HttpError } = require('./httpError');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(new HttpError(400, 'Validation failed', result.array()));
  }
  return next();
}

module.exports = { validate };
