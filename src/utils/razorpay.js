import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
let client = null;
export function paymentProvider() {
    return env.paymentProvider === 'demo' ? 'demo' : 'razorpay';
}
export function getRazorpay() {
    if (!env.razorpayKeyId || !env.razorpayKeySecret) {
        throw new Error('Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env');
    }
    if (!client) {
        client = new Razorpay({
            key_id: env.razorpayKeyId,
            key_secret: env.razorpayKeySecret,
        });
    }
    return client;
}
export function verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(body)
        .digest('hex');
    return expected === razorpaySignature;
}
export function rupeesToPaise(amount) {
    return Math.round(amount * 100);
}
