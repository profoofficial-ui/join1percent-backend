import type { Response } from 'express';
import { Bundle } from '../models/Bundle.js';
import { Course } from '../models/Course.js';
import { CommissionSettings } from '../models/CommissionSettings.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { WalletTxn } from '../models/WalletTxn.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getOrCreateCommission } from '../services/commission.js';

function formatPaidAt(date: Date) {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function sumCreditedCommissions(orderIds: string[]) {
  if (!orderIds.length) return 0;
  const rows = await WalletTxn.aggregate([
    { $match: { orderId: { $in: orderIds }, status: 'Credit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return Number(rows[0]?.total) || 0;
}

function estimateAffiliateShare(
  orders: Array<{ amount: number; sponsorCode?: string | null; bundleSlug: string }>,
  universalLevel1: number,
  bundleLevel1: Map<string, number>
) {
  return orders.reduce((sum, order) => {
    if (!order.sponsorCode) return sum;
    const level1 = bundleLevel1.has(order.bundleSlug)
      ? (bundleLevel1.get(order.bundleSlug) as number)
      : universalLevel1;
    return sum + Math.round(order.amount * (Math.max(0, level1) / 100));
  }, 0);
}

export async function getAdminStats(_req: AuthRequest, res: Response) {
  const [orders, bundles, courseCount, commission, registeredUsersCount] = await Promise.all([
    Order.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(500),
    Bundle.find().lean(),
    Course.countDocuments(),
    getOrCreateCommission(),
    User.countDocuments(),
  ]);

  const bundleCourseCount = new Map(
    bundles.map((bundle) => [bundle.slug, (bundle.courseIds || []).length])
  );
  const bundleLevel1 = new Map<string, number>();
  for (const bundle of bundles) {
    if (bundle.customCommission) {
      const percent = Array.isArray(bundle.commissionPercent) ? bundle.commissionPercent : [];
      bundleLevel1.set(bundle.slug, Number(percent[0]) || 0);
    }
  }

  const grossRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const referredCount = orders.filter((order) => Boolean(order.sponsorCode)).length;
  const courseSeats = orders.reduce(
    (sum, order) => sum + (bundleCourseCount.get(order.bundleSlug) || 0),
    0
  );
  const creditedAffiliateShare = await sumCreditedCommissions(orders.map((o) => o.orderId));
  const estimatedAffiliateShare =
    creditedAffiliateShare > 0
      ? creditedAffiliateShare
      : estimateAffiliateShare(orders, commission.percent[0], bundleLevel1);
  const netAfterEstimate = Math.max(0, grossRevenue - estimatedAffiliateShare);
  const avgOrderValue = orders.length ? Math.round(grossRevenue / orders.length) : 0;

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
      year: date.getFullYear(),
      month: date.getMonth(),
    };
  });

  const monthStats = months.map((month) => {
    const rows = orders.filter((order) => {
      if (!order.paidAt) return false;
      const paid = new Date(order.paidAt);
      return paid.getFullYear() === month.year && paid.getMonth() === month.month;
    });
    return {
      key: month.key,
      label: month.label,
      count: rows.length,
      amount: rows.reduce((sum, order) => sum + (order.amount || 0), 0),
    };
  });

  const byBundleMap = new Map<
    string,
    { slug: string; name: string; count: number; amount: number }
  >();
  for (const order of orders) {
    const existing = byBundleMap.get(order.bundleSlug) || {
      slug: order.bundleSlug,
      name: order.bundleName || order.bundleSlug,
      count: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.amount += order.amount || 0;
    byBundleMap.set(order.bundleSlug, existing);
  }
  const byBundle = [...byBundleMap.values()].sort((a, b) => b.amount - a.amount);

  const recentSales = orders.slice(0, 5).map((order) => ({
    orderId: order.orderId,
    paymentId: order.paymentId,
    name: order.name,
    email: order.email,
    phone: order.phone || '',
    bundleSlug: order.bundleSlug,
    bundleName: order.bundleName,
    amount: order.amount,
    method: order.paymentMethod,
    referral: order.sponsorCode || '',
    paidAt: order.paidAt ? formatPaidAt(order.paidAt) : '',
    paidAtIso: order.paidAt ? order.paidAt.toISOString() : '',
    status: order.status,
  }));

  const updatedAt = orders[0]?.paidAt
    ? new Date(orders[0].paidAt).toISOString()
    : new Date().toISOString();

  return res.json({
    updatedAt,
    catalogue: {
      courses: courseCount,
      bundles: bundles.length,
    },
    kpis: {
      grossRevenue,
      ordersCount: orders.length,
      registeredUsersCount,
      referredCount,
      directCount: Math.max(0, orders.length - referredCount),
      courseSeats,
      avgOrderValue,
      estimatedAffiliateShare,
      netAfterEstimate,
      commissionNote:
        creditedAffiliateShare > 0
          ? 'Affiliate share is the sum of multilevel wallet credits posted on successful referred payments.'
          : 'Affiliate share is estimated from Level-1 % until commissions are posted to wallets.',
    },
    commission,
    monthStats,
    byBundle,
    recentSales,
  });
}

export async function getCommissionSettings(_req: AuthRequest, res: Response) {
  const commission = await getOrCreateCommission();
  return res.json({ commission });
}

export async function updateCommissionSettings(req: AuthRequest, res: Response) {
  const levels = Math.min(3, Math.max(1, Number(req.body?.levels) || 1));
  const raw = Array.isArray(req.body?.percent) ? req.body.percent : [];
  const percent: [number, number, number] = [
    Math.max(0, Math.min(100, Number(raw[0]) || 0)),
    Math.max(0, Math.min(100, Number(raw[1]) || 0)),
    Math.max(0, Math.min(100, Number(raw[2]) || 0)),
  ];

  const doc = await CommissionSettings.findOneAndUpdate(
    { key: 'default' },
    { levels, percent },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({
    commission: {
      levels: doc?.levels ?? levels,
      percent: (doc?.percent as number[] | undefined)?.slice(0, 3) ?? percent,
      updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    },
  });
}
