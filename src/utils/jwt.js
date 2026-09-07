import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export function signToken(payload) {
    const options = {
        expiresIn: env.jwtExpiresIn,
    };
    return jwt.sign(payload, env.jwtSecret, options);
}
export function verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
}
