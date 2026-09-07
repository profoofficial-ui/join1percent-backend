import { KycSubmission, KYC_STATUSES } from '../models/KycSubmission.js';
import { User } from '../models/User.js';
function publicKyc(doc) {
    return {
        id: String(doc._id),
        userId: String(doc.userId),
        email: doc.email,
        name: doc.name,
        holder: doc.holder,
        bank: doc.bank,
        account: doc.account,
        ifsc: doc.ifsc,
        pan: doc.pan,
        aadhaar: doc.aadhaar,
        status: doc.status,
        reviewNote: doc.reviewNote || '',
        reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt).toISOString() : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
}
export async function getMyKyc(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const doc = await KycSubmission.findOne({ userId: req.user.id });
    if (!doc) {
        return res.json({ kyc: null });
    }
    return res.json({ kyc: publicKyc(doc) });
}
export async function submitMyKyc(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const holder = String(req.body?.holder || '').trim();
    const bank = String(req.body?.bank || '').trim();
    const account = String(req.body?.account || '').trim();
    const ifsc = String(req.body?.ifsc || '').trim().toUpperCase();
    const pan = String(req.body?.pan || '').trim().toUpperCase();
    const aadhaar = String(req.body?.aadhaar || '').trim();
    if (!holder || !bank || !account || !ifsc || !pan || !aadhaar) {
        return res.status(400).json({ message: 'All KYC fields are required.' });
    }
    if (!/^[A-Za-z][A-Za-z .']*$/.test(holder) || holder.length < 2) {
        return res.status(400).json({ message: 'Enter a valid account holder name.' });
    }
    if (bank.length < 2) {
        return res.status(400).json({ message: 'Enter a valid bank name.' });
    }
    if (!/^\d{9,18}$/.test(account)) {
        return res.status(400).json({ message: 'Account number must be 9–18 digits.' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        return res.status(400).json({ message: 'IFSC must be 11 characters (e.g. HDFC0001234).' });
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        return res.status(400).json({ message: 'PAN must look like ABCDE1234F.' });
    }
    if (!/^\d{12}$/.test(aadhaar)) {
        return res.status(400).json({ message: 'Aadhaar must be exactly 12 digits.' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(401).json({ message: 'Account not found.' });
    }
    const existing = await KycSubmission.findOne({ userId: user._id });
    if (existing?.status === 'approved') {
        return res.status(400).json({
            message: 'KYC is already approved. Contact support if you need changes.',
        });
    }
    const payload = {
        userId: user._id,
        email: user.email,
        name: user.name,
        holder,
        bank,
        account,
        ifsc,
        pan,
        aadhaar,
        status: 'pending',
        reviewNote: '',
        reviewedAt: null,
        reviewedBy: null,
    };
    let doc;
    if (existing) {
        existing.holder = holder;
        existing.bank = bank;
        existing.account = account;
        existing.ifsc = ifsc;
        existing.pan = pan;
        existing.aadhaar = aadhaar;
        existing.email = user.email;
        existing.name = user.name;
        existing.status = 'pending';
        existing.reviewNote = '';
        existing.reviewedAt = null;
        existing.reviewedBy = null;
        doc = await existing.save();
    }
    else {
        doc = await KycSubmission.create(payload);
    }
    return res.status(existing ? 200 : 201).json({ kyc: publicKyc(doc) });
}
export async function listAdminKyc(req, res) {
    const status = String(req.query?.status || 'all').trim();
    const filter = status !== 'all' && KYC_STATUSES.includes(status)
        ? { status }
        : {};
    const docs = await KycSubmission.find(filter).sort({ updatedAt: -1 }).limit(200);
    return res.json({
        kyc: docs.map(publicKyc),
        counts: {
            pending: await KycSubmission.countDocuments({ status: 'pending' }),
            approved: await KycSubmission.countDocuments({ status: 'approved' }),
            rejected: await KycSubmission.countDocuments({ status: 'rejected' }),
        },
    });
}
export async function reviewKyc(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const id = String(req.params.id || '');
    const status = String(req.body?.status || '').trim();
    const reviewNote = String(req.body?.reviewNote || '').trim();
    if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ message: 'status must be approved or rejected.' });
    }
    const doc = await KycSubmission.findById(id);
    if (!doc) {
        return res.status(404).json({ message: 'KYC submission not found.' });
    }
    doc.status = status;
    doc.reviewNote = reviewNote;
    doc.reviewedAt = new Date();
    doc.reviewedBy = req.user.id;
    await doc.save();
    return res.json({ kyc: publicKyc(doc) });
}
