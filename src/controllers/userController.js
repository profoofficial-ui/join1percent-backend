import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
export async function listAdminUsers(req, res) {
    try {
        const { q, plan, role, status } = req.query;
        const filter = {};
        if (role && role !== 'all') {
            filter.role = role;
        }
        if (plan && plan !== 'all') {
            filter.planSlug = plan === 'none' ? null : plan;
        }
        if (status && status !== 'all') {
            filter.isActive = status === 'active';
        }
        if (q && q.trim()) {
            const searchRegex = new RegExp(q.trim(), 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { affiliateCode: searchRegex },
                { sponsorCode: searchRegex },
            ];
        }
        const users = await User.find(filter)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .lean();
        // Fetch order counts and referral counts to enrich user cards
        const userEmails = users.map((u) => u.email.toLowerCase());
        const userCodes = users.map((u) => u.affiliateCode).filter(Boolean);
        const [orderStats, referralStats] = await Promise.all([
            Order.aggregate([
                { $match: { email: { $in: userEmails }, status: 'paid' } },
                { $group: { _id: '$email', count: { $sum: 1 }, totalSpent: { $sum: '$amount' } } },
            ]),
            User.aggregate([
                { $match: { sponsorCode: { $in: userCodes } } },
                { $group: { _id: '$sponsorCode', count: { $sum: 1 } } },
            ]),
        ]);
        const orderMap = new Map();
        for (const stat of orderStats) {
            if (stat._id)
                orderMap.set(stat._id.toLowerCase(), { count: stat.count, totalSpent: stat.totalSpent });
        }
        const referralMap = new Map();
        for (const stat of referralStats) {
            if (stat._id)
                referralMap.set(stat._id.toUpperCase(), stat.count);
        }
        const enriched = users.map((user) => {
            const orders = orderMap.get(user.email.toLowerCase()) || { count: 0, totalSpent: 0 };
            const teamCount = user.affiliateCode ? referralMap.get(user.affiliateCode.toUpperCase()) || 0 : 0;
            return {
                ...user,
                ordersCount: orders.count,
                totalSpent: orders.totalSpent,
                referralsCount: teamCount,
            };
        });
        return res.json({ users: enriched, total: users.length });
    }
    catch (error) {
        console.error('Error listing admin users:', error);
        return res.status(500).json({ message: 'Failed to list users.' });
    }
}
export async function updateAdminUser(req, res) {
    try {
        const { id } = req.params;
        const { name, phone, role, planSlug, walletBalance, isActive, sponsorCode } = req.body;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (name !== undefined)
            user.name = String(name).trim();
        if (phone !== undefined)
            user.phone = String(phone).trim();
        if (role !== undefined && ['admin', 'student'].includes(role))
            user.role = role;
        if (planSlug !== undefined)
            user.planSlug = planSlug || null;
        if (walletBalance !== undefined && !Number.isNaN(Number(walletBalance))) {
            user.walletBalance = Math.max(0, Number(walletBalance));
        }
        if (isActive !== undefined)
            user.isActive = Boolean(isActive);
        if (sponsorCode !== undefined)
            user.sponsorCode = sponsorCode ? String(sponsorCode).trim().toUpperCase() : null;
        await user.save();
        const result = user.toObject();
        delete result.passwordHash;
        return res.json({ user: result });
    }
    catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Failed to update user.' });
    }
}
export async function deleteAdminUser(req, res) {
    try {
        const { id } = req.params;
        // Prevent deleting oneself
        if (req.user?.id === id) {
            return res.status(400).json({ message: 'You cannot delete your own admin account.' });
        }
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Safety check: Don't delete the primary root admin
        if (user.email === 'admin@coursellm.com') {
            return res.status(400).json({ message: 'Cannot delete the primary root administrator.' });
        }
        await User.findByIdAndDelete(id);
        return res.json({ ok: true, message: 'User removed successfully.' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Failed to delete user.' });
    }
}
