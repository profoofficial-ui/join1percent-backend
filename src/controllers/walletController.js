import { WalletTxn } from '../models/WalletTxn.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Bundle } from '../models/Bundle.js';
function formatDate(date) {
    if (!date)
        return '';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
export async function getMyWallet(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive account.' });
    }
    const docs = await WalletTxn.find({ userId: user._id }).sort({ createdAt: -1 }).limit(200);
    const payouts = await PayoutRequest.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100);
    const creditTxns = docs.map((doc) => ({
        id: String(doc._id),
        date: formatDate(doc.createdAt),
        type: doc.type,
        amount: doc.amount,
        status: doc.status,
        level: doc.level,
        percent: doc.percent,
        orderId: doc.orderId,
        buyerName: doc.buyerName || '',
        bundleName: doc.bundleName || '',
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    }));
    const payoutTxns = payouts.flatMap((doc) => {
        const base = {
            id: `payout-${String(doc._id)}`,
            date: formatDate(doc.createdAt),
            amount: doc.amount,
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
            payoutStatus: doc.status,
        };
        if (doc.status === 'rejected') {
            return [
                {
                    ...base,
                    id: `payout-${String(doc._id)}-req`,
                    type: 'Withdrawal · Rejected',
                    status: 'Debit',
                },
                {
                    ...base,
                    id: `payout-${String(doc._id)}-refund`,
                    type: 'Withdrawal · Refunded',
                    status: 'Credit',
                },
            ];
        }
        return [
            {
                ...base,
                type: doc.status === 'pending' ? 'Withdrawal · In review' : 'Withdrawal · Paid',
                status: 'Debit',
            },
        ];
    });
    const txns = [...creditTxns, ...payoutTxns].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
    });
    const pendingAgg = await PayoutRequest.aggregate([
        { $match: { userId: user._id, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const paidAgg = await PayoutRequest.aggregate([
        { $match: { userId: user._id, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return res.json({
        balance: user.walletBalance || 0,
        affiliateCode: user.affiliateCode || '',
        pendingWithdrawal: pendingAgg[0]?.total || 0,
        withdrawnTotal: paidAgg[0]?.total || 0,
        txns,
    });
}
/** Direct referrals for the logged-in affiliate */
export async function getMyAffiliates(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const me = await User.findById(req.user.id);
    if (!me?.affiliateCode) {
        return res.json({ affiliates: [] });
    }
    const rows = await User.find({
        sponsorCode: me.affiliateCode,
        role: 'student',
        isActive: true,
    })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    const emails = rows.map((row) => row.email);
    const latestOrders = emails.length
        ? await Order.find({ email: { $in: emails }, status: 'paid' })
            .sort({ paidAt: -1 })
            .lean()
        : [];
    const paymentByEmail = new Map();
    for (const order of latestOrders) {
        if (!paymentByEmail.has(order.email)) {
            paymentByEmail.set(order.email, order.paymentMethod || 'Razorpay');
        }
    }
    return res.json({
        affiliates: rows.map((row) => ({
            code: row.affiliateCode || '',
            name: row.name,
            email: row.email,
            phone: row.phone || '',
            sponsorCode: row.sponsorCode || null,
            planSlug: row.planSlug || '',
            wallet: row.walletBalance || 0,
            payment: paymentByEmail.get(row.email) || '—',
            joined: row.createdAt
                ? new Date(row.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })
                : '',
        })),
    });
}

/** 3-Level Genealogy Referral Tree for the logged-in affiliate */
export async function getMyReferralTree(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    let targetUserId = req.user.id;
    if (req.query.userId && req.user.role === 'admin') {
        targetUserId = req.query.userId;
    }
    const me = await User.findById(targetUserId).lean();
    if (!me) {
        return res.json({
            root: null,
            stats: {
                totalMembers: 0,
                l1Count: 0,
                l2Count: 0,
                l3Count: 0,
                totalEarned: 0,
            },
            tree: [],
            flat: [],
        });
    }

    const bundles = await Bundle.find().select('slug name price').lean();
    const bundleNameMap = new Map(bundles.map((b) => [b.slug, b.name]));

    if (!me.affiliateCode) {
        const rootNode = {
            id: String(me._id),
            code: 'NO-CODE',
            sponsorCode: me.sponsorCode || null,
            name: me.name,
            email: me.email,
            phone: me.phone || '',
            planSlug: me.planSlug || '',
            planName: bundleNameMap.get(me.planSlug) || (me.planSlug ? me.planSlug.toUpperCase() : 'Free / Pending'),
            wallet: me.walletBalance || 0,
            level: 0,
            commissionEarned: 0,
            joined: formatDate(me.createdAt),
            joinedIso: me.createdAt ? new Date(me.createdAt).toISOString() : null,
            children: [],
        };
        return res.json({
            root: rootNode,
            tree: [],
            flat: [],
            stats: {
                totalMembers: 0,
                l1Count: 0,
                l2Count: 0,
                l3Count: 0,
                totalEarned: 0,
            },
        });
    }

    // Get all commission credits earned by 'me'
    const myCredits = await WalletTxn.find({
        userId: me._id,
        status: 'Credit',
    }).lean();

    // Sum earnings by buyer email
    const earningsByEmail = new Map();
    let totalEarned = 0;
    for (const credit of myCredits) {
        const email = (credit.buyerEmail || '').toLowerCase();
        if (email) {
            const current = earningsByEmail.get(email) || 0;
            earningsByEmail.set(email, current + credit.amount);
        }
        totalEarned += credit.amount;
    }

    // 1. Level 1 Users (Direct)
    const l1Users = await User.find({
        sponsorCode: me.affiliateCode,
        role: 'student',
        isActive: true,
    })
        .sort({ createdAt: -1 })
        .lean();

    // 2. Level 2 Users
    const l1Codes = l1Users.map((u) => u.affiliateCode).filter(Boolean);
    const l2Users = l1Codes.length
        ? await User.find({
            sponsorCode: { $in: l1Codes },
            role: 'student',
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .lean()
        : [];

    // 3. Level 3 Users
    const l2Codes = l2Users.map((u) => u.affiliateCode).filter(Boolean);
    const l3Users = l2Codes.length
        ? await User.find({
            sponsorCode: { $in: l2Codes },
            role: 'student',
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .lean()
        : [];

    const formatMemberNode = (u, level) => {
        const email = (u.email || '').toLowerCase();
        return {
            id: String(u._id),
            code: u.affiliateCode || '',
            sponsorCode: u.sponsorCode || null,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            planSlug: u.planSlug || '',
            planName: bundleNameMap.get(u.planSlug) || (u.planSlug ? u.planSlug.toUpperCase() : 'Free / Pending'),
            wallet: u.walletBalance || 0,
            level,
            commissionEarned: earningsByEmail.get(email) || 0,
            joined: formatDate(u.createdAt),
            joinedIso: u.createdAt ? new Date(u.createdAt).toISOString() : null,
            children: [],
        };
    };

    // Build children maps
    // Map Level 3 under Level 2 by sponsorCode
    const l3NodesBySponsor = new Map();
    const l3Formatted = l3Users.map((u) => formatMemberNode(u, 3));
    for (const node of l3Formatted) {
        const sponsor = (node.sponsorCode || '').toUpperCase();
        if (!l3NodesBySponsor.has(sponsor)) {
            l3NodesBySponsor.set(sponsor, []);
        }
        l3NodesBySponsor.get(sponsor).push(node);
    }

    // Map Level 2 under Level 1 by sponsorCode, attaching their L3 children
    const l2NodesBySponsor = new Map();
    const l2Formatted = l2Users.map((u) => {
        const node = formatMemberNode(u, 2);
        node.children = l3NodesBySponsor.get((node.code || '').toUpperCase()) || [];
        return node;
    });
    for (const node of l2Formatted) {
        const sponsor = (node.sponsorCode || '').toUpperCase();
        if (!l2NodesBySponsor.has(sponsor)) {
            l2NodesBySponsor.set(sponsor, []);
        }
        l2NodesBySponsor.get(sponsor).push(node);
    }

    // Attach L2 children to Level 1 nodes
    const l1Formatted = l1Users.map((u) => {
        const node = formatMemberNode(u, 1);
        node.children = l2NodesBySponsor.get((node.code || '').toUpperCase()) || [];
        return node;
    });

    const rootNode = {
        id: String(me._id),
        code: me.affiliateCode,
        sponsorCode: me.sponsorCode || null,
        name: me.name,
        email: me.email,
        phone: me.phone || '',
        planSlug: me.planSlug || '',
        planName: bundleNameMap.get(me.planSlug) || (me.planSlug ? me.planSlug.toUpperCase() : 'Free / Pending'),
        wallet: me.walletBalance || 0,
        level: 0,
        commissionEarned: totalEarned,
        joined: formatDate(me.createdAt),
        joinedIso: me.createdAt ? new Date(me.createdAt).toISOString() : null,
        children: l1Formatted,
    };

    const flat = [...l1Formatted, ...l2Formatted, ...l3Formatted];

    return res.json({
        root: rootNode,
        tree: l1Formatted,
        flat,
        stats: {
            totalMembers: flat.length,
            l1Count: l1Formatted.length,
            l2Count: l2Formatted.length,
            l3Count: l3Formatted.length,
            totalEarned,
        },
    });
}

