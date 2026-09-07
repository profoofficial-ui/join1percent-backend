import mongoose from 'mongoose';
import { WalletTxn } from '../models/WalletTxn.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import { User } from '../models/User.js';
function formatDate(date) {
    if (!date)
        return '';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
export async function listAdminWalletTransactions(req, res) {
    const { userId, search, type, category, page = '1', limit = '50', } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));
    // 1. Calculate platform-level summary statistics
    const [platformBalanceAgg, creditAgg, payoutPaidAgg, payoutPendingAgg] = await Promise.all([
        User.aggregate([
            { $group: { _id: null, total: { $sum: '$walletBalance' } } },
        ]),
        WalletTxn.aggregate([
            { $match: { status: 'Credit' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PayoutRequest.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PayoutRequest.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);
    const stats = {
        totalPlatformBalance: platformBalanceAgg[0]?.total || 0,
        totalCommissionsCredited: creditAgg[0]?.total || 0,
        totalPayoutsPaid: payoutPaidAgg[0]?.total || 0,
        totalPendingWithdrawals: payoutPendingAgg[0]?.total || 0,
    };
    // 2. Build queries for WalletTxn and PayoutRequest
    const txnQuery = {};
    const payoutQuery = {};
    if (userId && mongoose.isValidObjectId(userId)) {
        txnQuery.userId = new mongoose.Types.ObjectId(userId);
        payoutQuery.userId = new mongoose.Types.ObjectId(userId);
    }
    // Fetch documents
    const [txnDocs, payoutDocs, allUsers] = await Promise.all([
        WalletTxn.find(txnQuery).sort({ createdAt: -1 }).limit(1000).lean(),
        PayoutRequest.find(payoutQuery).sort({ createdAt: -1 }).limit(500).lean(),
        User.find({}, '_id name email phone affiliateCode walletBalance role').lean(),
    ]);
    const userMap = new Map();
    for (const u of allUsers) {
        userMap.set(String(u._id), u);
    }
    // 3. Transform WalletTxn documents
    const creditTxns = txnDocs.map((doc) => {
        const user = userMap.get(String(doc.userId));
        return {
            id: String(doc._id),
            date: formatDate(doc.createdAt),
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
            type: doc.type,
            category: (doc.category || (doc.level && doc.level > 0 ? 'commission' : 'adjustment')),
            status: doc.status || 'Credit',
            amount: doc.amount,
            level: doc.level || 0,
            percent: doc.percent || 0,
            orderId: doc.orderId,
            buyerName: doc.buyerName || '',
            buyerEmail: doc.buyerEmail || '',
            bundleName: doc.bundleName || '',
            bundleSlug: doc.bundleSlug || '',
            adminNote: doc.adminNote || '',
            balanceAfter: doc.balanceAfter || 0,
            user: {
                id: String(user?._id || doc.userId),
                name: user?.name || 'Unknown User',
                email: user?.email || '',
                phone: user?.phone || '',
                affiliateCode: user?.affiliateCode || doc.affiliateCode || '',
                walletBalance: user?.walletBalance || 0,
                role: user?.role || 'student',
            },
        };
    });
    // 4. Transform PayoutRequest documents
    const payoutTxns = payoutDocs.map((doc) => {
        const user = userMap.get(String(doc.userId));
        const isPaid = doc.status === 'paid';
        const isRejected = doc.status === 'rejected';
        let displayType = 'Withdrawal · In review';
        let statusDirection = 'Debit';
        if (isPaid) {
            displayType = 'Withdrawal · Paid';
        }
        else if (isRejected) {
            displayType = 'Withdrawal · Rejected (Refunded)';
            statusDirection = 'Credit';
        }
        return {
            id: `payout-${String(doc._id)}`,
            date: formatDate(doc.createdAt),
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
            type: displayType,
            category: 'payout',
            status: statusDirection,
            amount: doc.amount,
            level: 0,
            percent: 0,
            orderId: `WDR-${String(doc._id).slice(-6).toUpperCase()}`,
            buyerName: '',
            buyerEmail: '',
            bundleName: '',
            bundleSlug: '',
            payoutStatus: doc.status,
            bankSnapshot: doc.bankSnapshot || {},
            adminNote: doc.adminNote || '',
            balanceAfter: 0,
            user: {
                id: String(user?._id || doc.userId),
                name: doc.name || user?.name || 'Affiliate User',
                email: doc.email || user?.email || '',
                phone: user?.phone || '',
                affiliateCode: doc.affiliateCode || user?.affiliateCode || '',
                walletBalance: user?.walletBalance || 0,
                role: user?.role || 'student',
            },
        };
    });
    // 5. Merge and sort
    let allTxns = [...creditTxns, ...payoutTxns].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
    });
    // 6. Apply search filter
    if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        allTxns = allTxns.filter((row) => {
            return (row.id.toLowerCase().includes(q) ||
                row.orderId.toLowerCase().includes(q) ||
                row.type.toLowerCase().includes(q) ||
                row.user.name.toLowerCase().includes(q) ||
                row.user.email.toLowerCase().includes(q) ||
                row.user.phone.toLowerCase().includes(q) ||
                row.user.affiliateCode.toLowerCase().includes(q) ||
                row.buyerName.toLowerCase().includes(q) ||
                row.buyerEmail.toLowerCase().includes(q) ||
                row.bundleName.toLowerCase().includes(q));
        });
    }
    // 7. Apply Direction (Type: Credit / Debit) filter
    if (type && type !== 'all') {
        allTxns = allTxns.filter((row) => row.status.toLowerCase() === type.toLowerCase());
    }
    // 8. Apply Category filter
    if (category && category !== 'all') {
        allTxns = allTxns.filter((row) => row.category.toLowerCase() === category.toLowerCase());
    }
    const total = allTxns.length;
    const pages = Math.max(1, Math.ceil(total / limitNum));
    const pagedTxns = allTxns.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    // Send lightweight list of users for dropdown selection
    const userOptions = allUsers
        .filter((u) => u.role !== 'admin' || (u.walletBalance && u.walletBalance > 0))
        .map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        affiliateCode: u.affiliateCode || '',
        walletBalance: u.walletBalance || 0,
    }))
        .sort((a, b) => b.walletBalance - a.walletBalance);
    return res.json({
        stats: {
            ...stats,
            totalTransactionsCount: total,
        },
        transactions: pagedTxns,
        total,
        page: pageNum,
        pages,
        users: userOptions,
    });
}
export async function adjustAdminWallet(req, res) {
    const { userId, amount, type, reason } = req.body;
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Valid user ID is required.' });
    }
    const parsedAmount = Math.round(Number(amount));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number greater than 0.' });
    }
    if (type !== 'Credit' && type !== 'Debit') {
        return res.status(400).json({ message: 'Adjustment type must be either Credit or Debit.' });
    }
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }
    if (type === 'Debit' && (user.walletBalance || 0) < parsedAmount) {
        return res.status(400).json({
            message: `Insufficient wallet balance. Current balance is ₹${user.walletBalance || 0}.`,
        });
    }
    const balanceDelta = type === 'Credit' ? parsedAmount : -parsedAmount;
    const updatedUser = await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: balanceDelta } }, { new: true });
    if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update user wallet balance.' });
    }
    const cleanReason = (reason || '').trim() || `Manual ${type} adjustment by Admin`;
    const orderId = `ADJ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const txn = await WalletTxn.create({
        userId: user._id,
        affiliateCode: user.affiliateCode || 'ADMIN',
        orderId,
        level: 0,
        amount: parsedAmount,
        percent: 0,
        status: type,
        type: cleanReason,
        category: 'adjustment',
        adminNote: cleanReason,
        balanceAfter: updatedUser.walletBalance || 0,
    });
    return res.json({
        success: true,
        message: `Successfully ${type === 'Credit' ? 'credited' : 'debited'} ₹${parsedAmount.toLocaleString('en-IN')} for ${user.name}.`,
        user: {
            id: String(updatedUser._id),
            name: updatedUser.name,
            email: updatedUser.email,
            walletBalance: updatedUser.walletBalance || 0,
        },
        transaction: {
            id: String(txn._id),
            orderId: txn.orderId,
            amount: txn.amount,
            status: txn.status,
            type: txn.type,
            date: formatDate(txn.createdAt),
            balanceAfter: txn.balanceAfter,
        },
    });
}
