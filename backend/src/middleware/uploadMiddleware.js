import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const storage = multer.diskStorage({
  // OCR uploads are temporary and are removed by the controller after processing.
  // Use the OS temp directory so the API does not require write access to the project tree.
  destination: os.tmpdir(),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new ApiError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WEBP, and HEIC images are allowed'));
    }
    return callback(null, true);
  },
}).single('image');
