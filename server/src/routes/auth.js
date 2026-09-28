import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, login, publicUser } from '../services/auth.js';
import { loginInput } from '../utils/validation.js';

export function authRoutes(secret, loginLimit = 10) {
  const router = Router();
  router.post(
    '/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: loginLimit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many sign-in attempts. Please try again in 15 minutes.',
        },
      },
    }),
    async (req, res) =>
      res.json(await login(loginInput.parse(req.body), secret)),
  );
  router.get('/me', authenticate(secret), (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  return router;
}
