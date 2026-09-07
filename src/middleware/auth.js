import { User } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';
export async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const token = header.slice(7);
        const payload = verifyToken(token);
        const user = await User.findById(payload.sub).select('-passwordHash');
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive account.' });
        }
        req.user = {
            id: String(user._id),
            email: user.email,
            role: user.role,
            name: user.name,
        };
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}
export function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    return next();
}
