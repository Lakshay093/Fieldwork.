import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { authRoutes } from './routes/auth.js';
import { leaveRoutes } from './routes/leaves.js';
import { authenticate } from './services/auth.js';
import { AppError, errorHandler } from './utils/errors.js';

export function createApp({
  jwtSecret,
  clientOrigin = 'http://localhost:5173',
  trustProxy = 0,
  loginLimit,
  now,
} = {}) {
  if (!jwtSecret || jwtSecret.length < 32)
    throw new Error('JWT secret must have at least 32 characters.');
  const app = express();
  app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');
  app.use(helmet());
  const origins = clientOrigin.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin(origin, done) {
        if (!origin || origins.includes(origin)) done(null, true);
        else
          done(
            new AppError(
              403,
              'ORIGIN_NOT_ALLOWED',
              'This origin is not allowed.',
            ),
          );
      },
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ok' : 'unavailable' });
  });
  app.use('/api/auth', authRoutes(jwtSecret, loginLimit));
  app.use('/api/leaves', authenticate(jwtSecret), leaveRoutes(now));
  app.use((_req, _res, next) =>
    next(new AppError(404, 'NOT_FOUND', 'This endpoint does not exist.')),
  );
  app.use(errorHandler);
  return app;
}
