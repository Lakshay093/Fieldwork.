import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const dummyHash = bcrypt.hashSync('constant-time-comparison-only', 12);
export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function login({ email, password }, secret) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? dummyHash,
  );
  if (!user || !matches)
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect.',
    );
  const token = jwt.sign({}, secret, {
    subject: String(user._id),
    expiresIn: '8h',
    algorithm: 'HS256',
    issuer: 'fieldwork',
    audience: 'fieldwork-web',
  });
  return { token, user: publicUser(user) };
}

export function authenticate(secret) {
  return async (req, _res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token)
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    let claims;
    try {
      claims = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'fieldwork',
        audience: 'fieldwork-web',
      });
    } catch {
      throw new AppError(
        401,
        'SESSION_EXPIRED',
        'Your session has expired. Please sign in again.',
      );
    }
    if (typeof claims.sub !== 'string' || !/^[a-f\d]{24}$/i.test(claims.sub))
      throw new AppError(401, 'INVALID_TOKEN', 'Please sign in again.');
    const user = await User.findById(claims.sub);
    if (!user)
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    req.user = user;
    next();
  };
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user.role !== role)
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have access to this action.',
      );
    next();
  };
}
