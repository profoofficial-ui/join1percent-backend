import type { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';
import type { AuthRequest } from './auth.js';

/** If a Bearer token is present and valid, attach req.user; otherwise continue as guest. */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next();
    }
    const token = header.slice(7);
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (user?.isActive) {
      req.user = {
        id: String(user._id),
        email: user.email,
        role: user.role,
        name: user.name,
      };
    }
  } catch {
    // Guest checkout continues without a session.
  }
  return next();
}
