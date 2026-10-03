import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function protect(req, _res, next) {
  try {
    const parts = (req.get('Authorization') || '').trim().split(/\s+/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
      throw new Error('Malformed authorization header');
    }

    const decoded = jwt.verify(parts[1], env.jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || typeof decoded.sub !== 'string' || !mongoose.Types.ObjectId.isValid(decoded.sub)) {
      throw new Error('Invalid token subject');
    }

    req.userId = decoded.sub;
    return next();
  } catch (error) {
    const message = error?.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Authentication required';
    return next(new ApiError(401, 'UNAUTHORIZED', message));
  }
}

// Compatibility alias for existing protected routes while they are migrated to protect.
export const authMiddleware = protect;
