import app from './app.js';
import os from 'node:os';
import { connectDatabase } from './config/db.js';
import { env, validateEnvironment } from './config/env.js';

async function startServer() {
  try {
    validateEnvironment();
    await connectDatabase();
    const server = app.listen(env.port, '0.0.0.0', () => {
      const interfaces = os.networkInterfaces();
      const addresses = Object.values(interfaces).flat().filter((address) => address && address.family === 'IPv4' && !address.internal);
      const lanIp = addresses[0]?.address || 'localhost';
      console.log(`Server running on port ${env.port}`);
      console.log(`OCR timeout: ${env.ocrTimeoutMs / 1000}s`);
      console.log(`API_BASE_URL: http://${lanIp}:${env.port}/api`);
    });
    // Leave time for Gemini classification and persistence after OCR completes.
    server.setTimeout(env.ocrTimeoutMs + 90000);
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
