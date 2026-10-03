import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fields = {};
    for (const error of errors.array()) {
      if (error.path && !fields[error.path]) fields[error.path] = error.msg;
    }
    const message = Object.values(fields).join('; ');
    return next(new ApiError(400, 'VALIDATION_ERROR', message, fields));
  }
  return next();
}
