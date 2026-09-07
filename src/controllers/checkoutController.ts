import type { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Bundle } from '../models/Bundle.js';
import { Order, PAYMENT_METHODS, type OrderDocument } from '../models/Order.js';
import { User, type UserDocument } from '../models/User.js';
import { WalletTxn } from '../models/WalletTxn.js';
import type { AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { signToken } from '../utils/jwt.js';
import {
  getRazorpay,
  paymentProvider,
  rupeesToPaise,
  verifyRazorpaySignature,
} from '../utils/razorpay.js';
import {
  makeOrderId,
  makePaymentId,
  publicUser,
  uniqueAffiliateCode,
} from '../utils/userPublic.js';
import { distributeCommissionsForPaidOrder } from '../services/commission.js';

function normalizeReferral(value: unknown) {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  return code || '';
}

async function findStudentByAffiliateCode(code: string) {
  if (!code) return null;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return User.findOne({
    affiliateCode: { $regex: `^${escaped}$`, $options: 'i' },
    role: 'student',
    isActive: true,
  });
}

function formatPaidAt(date: Date) {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function publicOrder(order: {
  orderId: string;
  paymentId: string;
  bundleSlug: string;
  bundleName: string;
  amount: number;
  paymentMethod: string;
  paidAt?: Date | null;
  email: string;
  name: string;
  phone?: string;
  sponsorCode?: string | null;
  status?: string;
}) {
  return {
    orderId: order.orderId,
    paymentId: order.paymentId,
    bundleSlug: order.bundleSlug,
    bundleName: order.bundleName,
    amount: order.amount,
    method: order.paymentMethod,
    paidAt: order.paidAt ? formatPaidAt(order.paidAt) : '',
    paidAtIso: order.paidAt ? order.paidAt.toISOString() : '',
    email: order.email,
    name: order.name,
    phone: order.phone || '',
    referral: order.sponsorCode || '',
    status: order.status || 'paid',
  };
}

type CheckoutFields = {
  slug: string;
  name: string;
  email: string;
  phone: string;
  state: string;
  password: string;
  referral: string;
  paymentMethod: string;
};

function readCheckoutFields(body: Record<string, unknown>): CheckoutFields {
  return {
    slug: String(body?.slug || '').trim(),
    name: String(body?.name || '').trim(),
    email: String(body?.email || '')
      .trim()
      .toLowerCase(),
    phone: String(body?.phone || '').trim(),
    state: String(body?.state || '').trim(),
    password: String(body?.password || ''),
    referral: normalizeReferral(body?.referral),
    paymentMethod: String(body?.paymentMethod || 'Razorpay'),
  };
}

function validateCheckoutFields(fields: CheckoutFields) {
  if (!fields.slug || !fields.name || !fields.email) {
    return 'Slug, name, and email are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) {
    return 'Enter a valid email address.';
  }
  const phone = fields.phone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return 'Enter a valid 10-digit Indian mobile number.';
  }
  return null;
}

async function assertCheckoutCredentials(
  fields: CheckoutFields,
  authUserId?: string
): Promise<{ error: string; status: number } | null> {
  const existing = await User.findOne({ email: fields.email });
  if (existing) {
    if (existing.role === 'admin') {
      return { error: 'Admin accounts cannot purchase plans.', status: 400 };
    }
    const sameSession = Boolean(authUserId && authUserId === String(existing._id));
    if (!sameSession) {
      if (!fields.password || fields.password.length < 4) {
        return { error: 'Password is required for this account.', status: 400 };
      }
      const ok = await bcrypt.compare(fields.password, existing.passwordHash);
      if (!ok) {
        return { error: 'Email already registered. Use the correct password.', status: 401 };
      }
    }
    return null;
  }
  if (!fields.password || fields.password.length < 6) {
    return { error: 'Password must be at least 6 characters.', status: 400 };
  }
  if (!/[A-Za-z]/.test(fields.password) || !/\d/.test(fields.password)) {
    return { error: 'Password must include letters and at least one number.', status: 400 };
  }
  return null;
}

async function resolveBuyer(
  fields: CheckoutFields,
  authUserId?: string
): Promise<{ user: UserDocument; sponsorCode: string | null } | { error: string; status: number }> {
  let user = await User.findOne({ email: fields.email });

  if (user) {
    if (user.role === 'admin') {
      return { error: 'Admin accounts cannot purchase plans.', status: 400 };
    }
    const sameSession = Boolean(authUserId && authUserId === String(user._id));
    if (!sameSession) {
      if (!fields.password || fields.password.length < 4) {
        return { error: 'Password is required for this account.', status: 400 };
      }
      const ok = await bcrypt.compare(fields.password, user.passwordHash);
      if (!ok) {
        return { error: 'Email already registered. Use the correct password.', status: 401 };
      }
    }
    user.name = fields.name;
    user.phone = fields.phone;
  } else {
    if (!fields.password || fields.password.length < 6) {
      return { error: 'Password must be at least 6 characters.', status: 400 };
    }
    if (!/[A-Za-z]/.test(fields.password) || !/\d/.test(fields.password)) {
      return { error: 'Password must include letters and at least one number.', status: 400 };
    }
    const passwordHash = await bcrypt.hash(fields.password, 10);
    user = await User.create({
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      passwordHash,
      role: 'student',
      affiliateCode: await uniqueAffiliateCode(fields.email),
      isActive: true,
    });
  }

  if (!user.affiliateCode) {
    user.affiliateCode = await uniqueAffiliateCode(fields.email);
  }

  let sponsorCode: string | null = user.sponsorCode ? normalizeReferral(user.sponsorCode) || null : null;
  if (fields.referral) {
    const sponsor = await findStudentByAffiliateCode(fields.referral);
    if (sponsor && String(sponsor._id) !== String(user._id)) {
      if (!user.sponsorCode) {
        sponsorCode = normalizeReferral(sponsor.affiliateCode) || sponsor.affiliateCode;
        user.sponsorCode = sponsorCode;
      } else {
        sponsorCode = normalizeReferral(user.sponsorCode) || user.sponsorCode;
      }
    }
  }

  return { user, sponsorCode };
}

async function fulfillEnrollment(opts: {
  fields: CheckoutFields;
  bundle: { slug: string; name: string; price: number };
  authUserId?: string;
  paymentId: string;
  paymentMethod: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  existingOrder?: OrderDocument | null;
}) {
  const buyer = await resolveBuyer(opts.fields, opts.authUserId);
  if ('error' in buyer) return buyer;

  const { user, sponsorCode } = buyer;
  user.planSlug = opts.bundle.slug;
  await user.save();

  const paidAt = new Date();
  let order = opts.existingOrder || null;

  if (order) {
    order.userId = user._id;
    order.email = user.email;
    order.name = user.name;
    order.phone = user.phone;
    order.state = opts.fields.state;
    order.paymentId = opts.paymentId;
    order.paymentMethod = opts.paymentMethod as (typeof PAYMENT_METHODS)[number];
    order.status = 'paid';
    order.sponsorCode = sponsorCode;
    order.paidAt = paidAt;
    if (opts.razorpayOrderId) order.razorpayOrderId = opts.razorpayOrderId;
    if (opts.razorpayPaymentId) order.razorpayPaymentId = opts.razorpayPaymentId;
    if (opts.razorpaySignature) order.razorpaySignature = opts.razorpaySignature;
    await order.save();
  } else {
    order = await Order.create({
      orderId: makeOrderId(),
      paymentId: opts.paymentId,
      userId: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      state: opts.fields.state,
      bundleSlug: opts.bundle.slug,
      bundleName: opts.bundle.name,
      amount: opts.bundle.price,
      paymentMethod: opts.paymentMethod,
      status: 'paid',
      sponsorCode,
      razorpayOrderId: opts.razorpayOrderId || '',
      razorpayPaymentId: opts.razorpayPaymentId || '',
      razorpaySignature: opts.razorpaySignature || '',
      paidAt,
    });
  }

  const token = signToken({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  });

  try {
    await distributeCommissionsForPaidOrder({
      orderId: order.orderId,
      amount: order.amount,
      bundleSlug: opts.bundle.slug,
      bundleName: opts.bundle.name,
      buyer: user,
      sponsorCode,
    });
  } catch (error) {
    console.error('Commission distribution failed for', order.orderId, error);
  }

  return {
    token,
    user: publicUser(user),
    order: publicOrder(order),
  };
}

/** Demo / legacy complete — only when PAYMENT_PROVIDER=demo */
export async function completeCheckout(req: AuthRequest, res: Response) {
  if (paymentProvider() !== 'demo') {
    return res.status(400).json({
      message: 'Demo checkout is disabled. Use Razorpay create-order + verify.',
    });
  }

  const fields = readCheckoutFields(req.body || {});
  const invalid = validateCheckoutFields(fields);
  if (invalid) return res.status(400).json({ message: invalid });

  const bundle = await Bundle.findOne({ slug: fields.slug });
  if (!bundle) return res.status(404).json({ message: 'Bundle not found.' });

  const method = (PAYMENT_METHODS as readonly string[]).includes(fields.paymentMethod)
    ? fields.paymentMethod
    : 'UPI';

  const result = await fulfillEnrollment({
    fields,
    bundle,
    authUserId: req.user?.id,
    paymentId: makePaymentId(),
    paymentMethod: method,
  });

  if ('error' in result) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.status(201).json(result);
}

/** Create pending order + Razorpay order for plan purchase */
export async function createCheckoutOrder(req: AuthRequest, res: Response) {
  if (paymentProvider() !== 'razorpay') {
    return res.status(400).json({ message: 'Razorpay is not enabled. Set PAYMENT_PROVIDER=razorpay.' });
  }

  const fields = readCheckoutFields(req.body || {});
  const invalid = validateCheckoutFields(fields);
  if (invalid) return res.status(400).json({ message: invalid });

  // Validate credentials early (account is created only after payment verify)
  const credsError = await assertCheckoutCredentials(fields, req.user?.id);
  if (credsError) {
    return res.status(credsError.status).json({ message: credsError.error });
  }

  const bundle = await Bundle.findOne({ slug: fields.slug });
  if (!bundle) return res.status(404).json({ message: 'Bundle not found.' });

  const orderId = makeOrderId();
  const amountPaise = rupeesToPaise(bundle.price);
  if (amountPaise < 100) {
    return res.status(400).json({ message: 'Bundle price must be at least ₹1 for Razorpay.' });
  }

  let sponsorCode: string | null = null;
  if (fields.referral) {
    const sponsor = await findStudentByAffiliateCode(fields.referral);
    if (sponsor && sponsor.email !== fields.email) {
      sponsorCode = normalizeReferral(sponsor.affiliateCode) || sponsor.affiliateCode;
    }
  }

  const razorpay = getRazorpay();
  const rpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: orderId,
    notes: {
      orderId,
      slug: bundle.slug,
      email: fields.email,
      plan: bundle.name,
    },
  });

  await Order.create({
    orderId,
    paymentId: '',
    userId: null,
    email: fields.email,
    name: fields.name,
    phone: fields.phone,
    state: fields.state,
    bundleSlug: bundle.slug,
    bundleName: bundle.name,
    amount: bundle.price,
    paymentMethod: 'Razorpay',
    status: 'pending',
    sponsorCode,
    razorpayOrderId: String(rpOrder.id),
    paidAt: null,
  });

  return res.status(201).json({
    provider: 'razorpay',
    keyId: env.razorpayKeyId,
    orderId,
    razorpayOrderId: rpOrder.id,
    amount: amountPaise,
    currency: 'INR',
    bundleName: bundle.name,
    prefill: {
      name: fields.name,
      email: fields.email,
      contact: fields.phone.replace(/\D/g, '').slice(-10),
    },
  });
}

/** Verify Razorpay signature and activate plan */
export async function verifyCheckoutPayment(req: AuthRequest, res: Response) {
  if (paymentProvider() !== 'razorpay') {
    return res.status(400).json({ message: 'Razorpay is not enabled.' });
  }

  const fields = readCheckoutFields(req.body || {});
  const razorpayOrderId = String(req.body?.razorpay_order_id || '').trim();
  const razorpayPaymentId = String(req.body?.razorpay_payment_id || '').trim();
  const razorpaySignature = String(req.body?.razorpay_signature || '').trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Missing Razorpay payment fields.' });
  }

  const invalid = validateCheckoutFields(fields);
  if (invalid) return res.status(400).json({ message: invalid });

  if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return res.status(400).json({ message: 'Invalid payment signature.' });
  }

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }
  if (order.status === 'paid') {
    const user = await User.findById(order.userId);
    if (!user) return res.status(404).json({ message: 'User not found for paid order.' });
    try {
      await distributeCommissionsForPaidOrder({
        orderId: order.orderId,
        amount: order.amount,
        bundleSlug: order.bundleSlug,
        bundleName: order.bundleName,
        buyer: user,
        sponsorCode: order.sponsorCode,
      });
    } catch (error) {
      console.error('Commission backfill failed for', order.orderId, error);
    }
    const token = signToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
    });
    return res.json({
      token,
      user: publicUser(user),
      order: publicOrder(order),
    });
  }

  const bundle = await Bundle.findOne({ slug: order.bundleSlug });
  if (!bundle) return res.status(404).json({ message: 'Bundle not found.' });

  // Ensure client email matches pending order
  if (fields.email !== order.email) {
    return res.status(400).json({ message: 'Checkout email does not match this order.' });
  }

  const result = await fulfillEnrollment({
    fields,
    bundle,
    authUserId: req.user?.id,
    paymentId: razorpayPaymentId,
    paymentMethod: 'Razorpay',
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    existingOrder: order,
  });

  if ('error' in result) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.status(201).json(result);
}

/** Mark a pending order failed/cancelled (Checkout dismiss or payment.failed) */
export async function failCheckoutOrder(req: AuthRequest, res: Response) {
  const razorpayOrderId = String(req.body?.razorpay_order_id || req.body?.razorpayOrderId || '').trim();
  const reason = String(req.body?.reason || 'cancelled').trim() || 'cancelled';

  if (!razorpayOrderId) {
    return res.status(400).json({ message: 'razorpay_order_id is required.' });
  }

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }
  if (order.status === 'paid') {
    return res.json({ ok: true, status: order.status, message: 'Order already paid.' });
  }

  order.status = 'failed';
  order.failureReason = reason;
  await order.save();

  return res.json({ ok: true, status: order.status, orderId: order.orderId });
}

/** Razorpay webhook — payment.failed / payment.captured backup */
export async function razorpayWebhook(req: AuthRequest, res: Response) {
  const secret = env.razorpayWebhookSecret;
  if (!secret) {
    return res.status(503).json({ message: 'RAZORPAY_WEBHOOK_SECRET is not configured.' });
  }

  const signature = String(req.headers['x-razorpay-signature'] || '');
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected !== signature) {
    return res.status(400).json({ message: 'Invalid webhook signature.' });
  }

  const payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
    ? req.body
    : JSON.parse(rawBody);

  const event = String(payload?.event || '');
  const paymentEntity = payload?.payload?.payment?.entity;
  const orderEntity = payload?.payload?.order?.entity;
  const razorpayOrderId = String(
    paymentEntity?.order_id || orderEntity?.id || ''
  ).trim();

  if (!razorpayOrderId) {
    return res.json({ ok: true, ignored: true });
  }

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) {
    return res.json({ ok: true, ignored: true });
  }

  if (event === 'payment.failed' && order.status !== 'paid') {
    order.status = 'failed';
    order.failureReason = String(paymentEntity?.error_description || paymentEntity?.error_code || 'payment.failed');
    if (paymentEntity?.id) order.razorpayPaymentId = String(paymentEntity.id);
    await order.save();
  }

  // Captured is normally handled by /verify; webhook is a backup only.
  if ((event === 'payment.captured' || event === 'order.paid') && order.status === 'pending') {
    order.failureReason = 'awaiting_client_verify';
    if (paymentEntity?.id) order.razorpayPaymentId = String(paymentEntity.id);
    await order.save();
  }

  return res.json({ ok: true });
}

export async function listMyOrders(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const orders = await Order.find({ userId: req.user.id, status: 'paid' }).sort({ paidAt: -1 });
  return res.json({ orders: orders.map(publicOrder) });
}

export async function listAdminOrders(_req: AuthRequest, res: Response) {
  const orders = await Order.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(200);
  const orderIds = orders.map((order) => order.orderId);
  const txns = orderIds.length
    ? await WalletTxn.find({ orderId: { $in: orderIds }, status: 'Credit' }).lean()
    : [];

  const byOrder = new Map<
    string,
    Array<{ level: number; affiliateCode: string; amount: number; percent: number }>
  >();
  for (const txn of txns) {
    const list = byOrder.get(txn.orderId) || [];
    list.push({
      level: txn.level ?? 0,
      affiliateCode: txn.affiliateCode,
      amount: txn.amount,
      percent: txn.percent || 0,
    });
    byOrder.set(txn.orderId, list);
  }

  return res.json({
    orders: orders.map((order) => {
      const levels = (byOrder.get(order.orderId) || []).sort((a, b) => a.level - b.level);
      const commissionPaid = levels.reduce((sum, row) => sum + row.amount, 0);
      return {
        ...publicOrder(order),
        state: order.state || '',
        status: order.status,
        commissionPaid,
        netAmount: Math.max(0, (order.amount || 0) - commissionPaid),
        commissionLevels: levels,
      };
    }),
  });
}
