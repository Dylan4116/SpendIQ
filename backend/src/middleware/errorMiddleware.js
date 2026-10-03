import { ApiError } from '../utils/ApiError.js';

export function notFoundMiddleware(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorMiddleware(err, _req, res, _next) {
  let error = err;
  if (err?.code === 11000) error = new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
  else if (err?.name === 'ValidationError') error = new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed');
  else if (err?.code === 'LIMIT_FILE_SIZE') error = new ApiError(400, 'FILE_TOO_LARGE', 'Image must be 10 MB or smaller');
  else if (err?.code === 'LIMIT_UNEXPECTED_FILE') error = new ApiError(400, 'FILE_REQUIRED', 'Use the image form field for the upload');
  else if (err?.code === 'INVALID_FILE_TYPE') error = new ApiError(400, 'INVALID_FILE_TYPE', err.message);

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.statusCode ? error.message : 'Internal server error';
  if (statusCode >= 500) console.error(err);

  const responseError = { code, message };
  if (error.fields) responseError.fields = error.fields;
  res.status(statusCode).json({ success: false, error: responseError });
}
