import bcrypt from 'bcryptjs';
import { connectDatabase } from '../src/config/db.js';
import { validateEnvironment } from '../src/config/env.js';
import User from '../src/models/User.js';

async function seed() {
  validateEnvironment();
  await connectDatabase();
  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const user = await User.findOneAndUpdate(
    { email: 'demo@tektonix.com' },
    {
      name: 'Tektonix Demo',
      email: 'demo@tektonix.com',
      passwordHash,
      budgets: [{ category: 'FOOD', monthlyLimit: 7000 }],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Seeded demo user: ${user.email}`);
  process.exitCode = 0;
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
