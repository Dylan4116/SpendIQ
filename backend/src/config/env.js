import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  ocrServiceUrl: process.env.OCR_SERVICE_URL || '',
  // CPU OCR on a phone photo can take longer than 30 seconds.
  ocrTimeoutMs: Math.min(Math.max(Number(process.env.OCR_TIMEOUT_MS) || 120000, 1), 180000),
};

export function validateEnvironment() {
  const missing = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'GEMINI_API_KEY', 'OCR_SERVICE_URL']
    .filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
