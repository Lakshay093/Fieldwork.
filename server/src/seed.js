import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase } from './db.js';
import { seedDemo } from './services/seed.js';

try {
  if (env.NODE_ENV === 'production')
    throw new Error(
      'Demo seeding is disabled in production. Use a separate development database.',
    );
  await connectDatabase(env.MONGODB_URI);
  const result = await seedDemo(
    process.env.SEED_PASSWORD ?? 'FieldworkPass!28',
  );
  process.stdout.write(
    `Demo ready: ${result.users.length} accounts, ${result.requests} requests. Existing accounts and balances were preserved.\n`,
  );
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
