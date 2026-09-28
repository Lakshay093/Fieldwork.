import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase } from './db.js';
import { createApp } from './app.js';

try {
  await connectDatabase(env.MONGODB_URI);
  const app = createApp({
    jwtSecret: env.JWT_SECRET,
    clientOrigin: env.CLIENT_ORIGIN,
    trustProxy: env.TRUST_PROXY,
  });
  const server = app.listen(env.PORT, '0.0.0.0', () =>
    process.stdout.write(`Fieldwork API listening on port ${env.PORT}\n`),
  );
  async function shutdown() {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (error) {
  console.error('API startup failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}
