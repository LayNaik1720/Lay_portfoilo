import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

/** Populate req.user when a valid token is present; never rejects. */
export const attachUser = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (user && user.isActive) req.user = user;
  } catch {
    // An invalid or expired token is treated as anonymous.
  }
  return next();
});

/** Require any authenticated user. */
export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Please sign in to continue'));
  return next();
};

/** Require an authenticated admin. Customers are explicitly refused. */
export const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Admin sign in required'));
  if (req.user.role !== 'admin') return next(ApiError.forbidden('Administrator access only'));
  return next();
};
