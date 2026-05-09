const { HttpError } = require('../utils/httpError');

function errorHandler(err, _req, res, _next) {
  // Multer errors (file upload)
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : 'Upload failed';
    return res.status(400).json({ error: 'Bad Request', message, details: { code: err.code } });
  }

  // Mongoose duplicate key
  if (err && err.code === 11000) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Duplicate key',
      details: err.keyValue,
    });
  }

  // Mongoose bad ObjectId
  if (err && err.name === 'CastError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid id',
      details: { path: err.path, value: err.value },
    });
  }

  // Mongoose validation error
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Validation error',
      details: err.errors,
    });
  }

  const status = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof HttpError ? err.message : 'Internal Server Error';

  const payload = {
    error: status >= 500 ? 'Server Error' : 'Request Error',
    message,
  };

  if (err instanceof HttpError && err.details !== undefined) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.stack = err.stack;
  }

  return res.status(status).json(payload);
}

module.exports = { errorHandler };
