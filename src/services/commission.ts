import {
  CommissionSettings,
  DEFAULT_COMMISSION,
} from '../models/CommissionSettings.js';
import { Bundle } from '../models/Bundle.js';
import { Order } from '../models/Order.js';
import { User, type UserDocument } from '../models/User.js';
import { WalletTxn } from '../models/WalletTxn.js';

export type CommissionRates = {
  levels: number;
  percent: [number, number, number];
};

export async function getOrCreateCommission(): Promise<CommissionRates & { updatedAt: string }> {
  let doc = await CommissionSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await CommissionSettings.create({
      key: 'default',
      ...DEFAULT_COMMISSION,
    });
  }
  const percent = (doc.percent || DEFAULT_COMMISSION.percent).slice(0, 3);
  while (percent.length < 3) percent.push(0);
  return {
    levels: Math.min(3, Math.max(1, doc.levels || 1)),
    percent: [Number(percent[0]) || 0, Number(percent[1]) || 0, Number(percent[2]) || 0],
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function resolveCommissionRates(bundleSlug: string): Promise<CommissionRates> {
  const universal = await getOrCreateCommission();
  const bundle = await Bundle.findOne({ slug: bundleSlug }).lean();
  if (bundle?.customCommission) {
    const raw = Array.isArray(bundle.commissionPercent) ? bundle.commissionPercent : [];
    const percent: [number, number, number] = [
      Number(raw[0]) || 0,
      Number(raw[1]) || 0,
      Number(raw[2]) || 0,
    ];
    return {
      levels: Math.min(3, Math.max(1, Number(bundle.commissionLevels) || 3)),
      percent,
    };
  }
  return {
    levels: universal.levels,
    percent: universal.percent,
  };
}

function normalizeCode(value: unknown): string | null {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  return code || null;
}

async function findAffiliateByCode(code: string) {
  // Case-insensitive match; codes are stored uppercase but older rows may differ.
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return User.findOne({
    affiliateCode: { $regex: `^${escaped}$`, $options: 'i' },
    role: 'student',
    isActive: true,
  });
}

/**
 * Credit multilevel % commissions up the sponsor chain after a successful payment.
 * Idempotent per (orderId, level) — if L1 already posted, L2/L3 can still be filled.
 */
export async function distributeCommissionsForPaidOrder(opts: {
  orderId: string;
  amount: number;
  bundleSlug: string;
  bundleName: string;
  buyer: Pick<UserDocument, '_id' | 'name' | 'email' | 'sponsorCode'>;
  sponsorCode?: string | null;
}) {
  const rates = await resolveCommissionRates(opts.bundleSlug);
  let cursor = normalizeCode(opts.sponsorCode) || normalizeCode(opts.buyer.sponsorCode);

  if (!normalizeCode(opts.sponsorCode) && normalizeCode(opts.buyer.sponsorCode)) {
    await Order.updateOne(
      { orderId: opts.orderId },
      { $set: { sponsorCode: normalizeCode(opts.buyer.sponsorCode) } }
    );
  }

  let credited = 0;
  const buyerId = String(opts.buyer._id);
  const visited = new Set<string>();

  for (let level = 1; level <= rates.levels; level += 1) {
    if (!cursor) break;
    if (visited.has(cursor)) break;
    visited.add(cursor);

    const affiliate = await findAffiliateByCode(cursor);
    if (!affiliate) {
      console.warn(`[commission] No affiliate for code ${cursor} on order ${opts.orderId} L${level}`);
      break;
    }
    if (String(affiliate._id) === buyerId) break;

    const nextSponsor = normalizeCode(affiliate.sponsorCode);
    const percent = Math.max(0, Number(rates.percent[level - 1]) || 0);
    const amount = Math.round(opts.amount * (percent / 100));

    const alreadyLevel = await WalletTxn.exists({
      orderId: opts.orderId,
      level,
    });

    if (!alreadyLevel && amount > 0) {
      try {
        await WalletTxn.create({
          userId: affiliate._id,
          affiliateCode: affiliate.affiliateCode,
          orderId: opts.orderId,
          level,
          amount,
          percent,
          status: 'Credit',
          type: `L${level} · ${opts.bundleName} · ${opts.buyer.name}`,
          buyerName: opts.buyer.name,
          buyerEmail: opts.buyer.email,
          bundleSlug: opts.bundleSlug,
          bundleName: opts.bundleName,
        });
        await User.updateOne(
          { _id: affiliate._id },
          { $inc: { walletBalance: amount } }
        );
        credited += 1;
        console.log(
          `[commission] L${level} ₹${amount} (${percent}%) → ${affiliate.affiliateCode} for order ${opts.orderId}`
        );
      } catch (error: unknown) {
        const code = (error as { code?: number })?.code;
        if (code !== 11000) {
          console.error(`[commission] Failed L${level} for order ${opts.orderId}`, error);
          // Continue upline levels even if one level fails.
        }
      }
    }

    // Always walk to the next upline, even if this level was ₹0 or already paid.
    cursor = nextSponsor && nextSponsor !== cursor ? nextSponsor : null;
  }

  return { credited, skipped: credited === 0 };
}

/** If a user paid via referral but user.sponsorCode was never stored, repair it from the order. */
export async function repairSponsorCodesFromOrders() {
  const orders = await Order.find({
    status: 'paid',
    sponsorCode: { $nin: [null, ''] },
  })
    .sort({ paidAt: 1 })
    .limit(500);

  let repaired = 0;
  for (const order of orders) {
    const buyer = order.userId
      ? await User.findById(order.userId)
      : await User.findOne({ email: order.email });
    if (!buyer) continue;
    if (buyer.sponsorCode) continue;

    const sponsorCode = normalizeCode(order.sponsorCode);
    if (!sponsorCode) continue;
    if (normalizeCode(buyer.affiliateCode) === sponsorCode) continue;

    const sponsor = await findAffiliateByCode(sponsorCode);
    if (!sponsor) continue;

    buyer.sponsorCode = sponsorCode;
    await buyer.save();
    repaired += 1;
    console.log(`[commission] Repaired sponsor ${sponsorCode} on ${buyer.email}`);
  }
  return repaired;
}

/** Repair paid referred orders — fills any missing L2/L3 credits. */
export async function backfillMissingCommissions() {
  const orders = await Order.find({
    status: 'paid',
    sponsorCode: { $nin: [null, ''] },
  })
    .sort({ paidAt: -1 })
    .limit(500);

  let fixed = 0;
  for (const order of orders) {
    const buyer = order.userId
      ? await User.findById(order.userId)
      : await User.findOne({ email: order.email });
    if (!buyer) continue;

    const before = await WalletTxn.countDocuments({ orderId: order.orderId, status: 'Credit' });
    const result = await distributeCommissionsForPaidOrder({
      orderId: order.orderId,
      amount: order.amount,
      bundleSlug: order.bundleSlug,
      bundleName: order.bundleName,
      buyer,
      sponsorCode: order.sponsorCode,
    });
    const after = await WalletTxn.countDocuments({ orderId: order.orderId, status: 'Credit' });
    if (result.credited > 0 || after > before) fixed += 1;
  }
  return fixed;
}
