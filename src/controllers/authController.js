import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { publicUser } from '../utils/userPublic.js';
export async function login(req, res) {
    const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = signToken({
        sub: String(user._id),
        email: user.email,
        role: user.role,
    });
    return res.json({
        token,
        user: publicUser(user),
    });
}
export async function me(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive account.' });
    }
    return res.json({ user: publicUser(user) });
}
