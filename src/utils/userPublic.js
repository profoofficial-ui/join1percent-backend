import { User } from '../models/User.js';
export function publicUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        affiliateCode: user.affiliateCode || '',
        sponsorCode: user.sponsorCode || null,
        planSlug: user.planSlug || null,
        walletBalance: user.walletBalance || 0,
    };
}
export function baseAffiliateCode(email) {
    const base = email
        .split('@')[0]
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 8)
        .toUpperCase();
    return base || 'USER';
}
export async function uniqueAffiliateCode(email) {
    let code = baseAffiliateCode(email);
    let n = 2;
    while (await User.exists({ affiliateCode: code })) {
        code = `${baseAffiliateCode(email)}${n}`.slice(0, 12);
        n += 1;
    }
    return code;
}
export function makeOrderId() {
    return `CLM-${Date.now().toString().slice(-8)}`;
}
export function makePaymentId() {
    return `pay_demo_${Math.random().toString(36).slice(2, 10)}`;
}
