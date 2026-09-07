import { KycSubmission } from '../models/KycSubmission.js';
import { PayoutRequest, PAYOUT_STATUSES } from '../models/PayoutRequest.js';
import { User } from '../models/User.js';
const MIN_PAYOUT_AMOUNT = 100;
function formatDate(date) {
    if (!date)
        return '';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
function publicPayout(doc) {
    return {
        id: String(doc._id),
        amount: doc.amount,
        status: doc.status,
        adminNote: doc.adminNote || '',
        email: doc.email || '',
        name: doc.name || '',
        affiliateCode: doc.affiliateCode || '',
        bank: doc.bankSnapshot || {},
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt).toISOString() : null,
        date: formatDate(doc.createdAt),
    };
}
export async function requestPayout(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const amount = Math.round(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount < MIN_PAYOUT_AMOUNT) {
        return res.status(400).json({ message: `Minimum withdrawal is ₹${MIN_PAYOUT_AMOUNT}.` });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive account.' });
    }
    const kyc = await KycSubmission.findOne({ userId: user._id });
    if (!kyc || kyc.status !== 'approved') {
        return res.status(400).json({ message: 'Approved KYC is required before requesting a withdrawal.' });
    }
    if ((user.walletBalance || 0) < amount) {
        return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }
    const updated = await User.findOneAndUpdate({ _id: user._id, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true });
    if (!updated) {
        return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }
    const payout = await PayoutRequest.create({
        userId: user._id,
        affiliateCode: user.affiliateCode || '',
        email: user.email,
        name: user.name,
        amount,
        status: 'pending',
        bankSnapshot: {
            holder: kyc.holder,
            bank: kyc.bank,
            account: kyc.account,
            ifsc: kyc.ifsc,
            pan: kyc.pan,
        },
    });
    const pendingWithdrawal = await PayoutRequest.aggregate([
        { $match: { userId: user._id, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return res.status(201).json({
        payout: publicPayout(payout),
        balance: updated.walletBalance || 0,
        pendingWithdrawal: pendingWithdrawal[0]?.total || 0,
    });
}
export async function listAdminPayouts(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const status = String(req.query.status || 'pending').trim();
    const filter = status === 'all' ? {} : { status: PAYOUT_STATUSES.includes(status) ? status : 'pending' };
    const rows = await PayoutRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const counts = {
        pending: await PayoutRequest.countDocuments({ status: 'pending' }),
        paid: await PayoutRequest.countDocuments({ status: 'paid' }),
        rejected: await PayoutRequest.countDocuments({ status: 'rejected' }),
    };
    return res.json({
        payouts: rows.map((row) => publicPayout(row)),
        counts,
    });
}
export async function reviewPayout(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const id = String(req.params.id || '').trim();
    const nextStatus = String(req.body?.status || '').trim();
    const adminNote = String(req.body?.adminNote || '').trim();
    if (!['paid', 'rejected'].includes(nextStatus)) {
        return res.status(400).json({ message: 'Status must be paid or rejected.' });
    }
    const payout = await PayoutRequest.findById(id);
    if (!payout) {
        return res.status(404).json({ message: 'Payout request not found.' });
    }
    if (payout.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending payout requests can be updated.' });
    }
    payout.status = nextStatus;
    payout.adminNote = adminNote;
    payout.reviewedBy = req.user.id;
    payout.reviewedAt = new Date();
    if (nextStatus === 'rejected') {
        await User.updateOne({ _id: payout.userId }, { $inc: { walletBalance: payout.amount } });
    }
    await payout.save();
    return res.json({ payout: publicPayout(payout) });
}
