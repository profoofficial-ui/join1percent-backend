import type { Response } from 'express';
import { WalletTxn } from '../models/WalletTxn.js';
import { PayoutRequest } from '../models/PayoutRequest.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import type { AuthRequest } from '../middleware/auth.js';

function formatDate(date?: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export async function getMyWallet(req: AuthRequest, res: Response) {
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
    status: doc.status as 'Credit' | 'Debit',
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
          status: 'Debit' as const,
        },
        {
          ...base,
          id: `payout-${String(doc._id)}-refund`,
          type: 'Withdrawal · Refunded',
          status: 'Credit' as const,
        },
      ];
    }
    return [
      {
        ...base,
        type: doc.status === 'pending' ? 'Withdrawal · In review' : 'Withdrawal · Paid',
        status: 'Debit' as const,
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
export async function getMyAffiliates(req: AuthRequest, res: Response) {
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

  const paymentByEmail = new Map<string, string>();
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
