import type { Response } from 'express';
import { Bundle, type BundleDocument } from '../models/Bundle.js';
import { Course } from '../models/Course.js';
import type { AuthRequest } from '../middleware/auth.js';
import { toSlug } from '../utils/slug.js';

function normalizeCommissionPercent(raw: unknown): [number, number, number] {
  const arr = Array.isArray(raw) ? raw : [];
  return [
    Math.max(0, Math.min(100, Number(arr[0]) || 0)),
    Math.max(0, Math.min(100, Number(arr[1]) || 0)),
    Math.max(0, Math.min(100, Number(arr[2]) || 0)),
  ];
}

function publicBundle(bundle: BundleDocument) {
  const percent = normalizeCommissionPercent(bundle.commissionPercent);
  return {
    slug: bundle.slug,
    name: bundle.name,
    price: bundle.price,
    image: bundle.image || '',
    courseIds: bundle.courseIds || [],
    tagline: bundle.tagline || '',
    badge: bundle.badge || 'Popular',
    customCommission: Boolean(bundle.customCommission),
    commissionLevels: Math.min(3, Math.max(1, Number(bundle.commissionLevels) || 3)),
    commissionPercent: percent,
  };
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || `bundle-${Date.now()}`;
  let n = 2;
  while (true) {
    const existing = await Bundle.findOne({ slug });
    if (!existing || (excludeId && String(existing._id) === excludeId)) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

async function findBundleByParam(slugOrId: string) {
  if (/^[a-f\d]{24}$/i.test(slugOrId)) {
    const byId = await Bundle.findById(slugOrId);
    if (byId) return byId;
  }
  return Bundle.findOne({ slug: slugOrId });
}

async function assertCourseIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return { ok: false as const, message: 'At least one course is required.' };
  }
  const found = await Course.find({ slug: { $in: courseIds } }).select('slug');
  const foundSlugs = new Set(found.map((c) => c.slug));
  const missing = courseIds.filter((id) => !foundSlugs.has(id));
  if (missing.length) {
    return { ok: false as const, message: `Unknown course ids: ${missing.join(', ')}` };
  }
  return { ok: true as const };
}

export async function listBundles(_req: AuthRequest, res: Response) {
  const bundles = await Bundle.find().sort({ price: 1 });
  return res.json({ bundles: bundles.map(publicBundle) });
}

export async function getBundle(req: AuthRequest, res: Response) {
  const bundle = await findBundleByParam(String(req.params.id || ''));
  if (!bundle) {
    return res.status(404).json({ message: 'Bundle not found.' });
  }
  return res.json({ bundle: publicBundle(bundle) });
}

export async function createBundle(req: AuthRequest, res: Response) {
  const name = String(req.body?.name || '').trim();
  const price = Number(req.body?.price);
  const courseIds = Array.isArray(req.body?.courseIds)
    ? req.body.courseIds.map((id: unknown) => String(id).trim()).filter(Boolean)
    : [];

  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ message: 'Valid price is required.' });
  }

  const coursesOk = await assertCourseIds(courseIds);
  if (!coursesOk.ok) {
    return res.status(400).json({ message: coursesOk.message });
  }

  const requestedSlug = String(req.body?.slug || '').trim();
  const slug = await uniqueSlug(toSlug(requestedSlug || name));
  const bundle = await Bundle.create({
    slug,
    name,
    price,
    image: String(req.body?.image || '').trim(),
    courseIds,
    tagline: String(req.body?.tagline || '').trim(),
    badge: String(req.body?.badge || 'Popular').trim() || 'Popular',
    customCommission: Boolean(req.body?.customCommission),
    commissionLevels: Math.min(3, Math.max(1, Number(req.body?.commissionLevels) || 3)),
    commissionPercent: normalizeCommissionPercent(req.body?.commissionPercent),
  });

  return res.status(201).json({ bundle: publicBundle(bundle) });
}

export async function updateBundle(req: AuthRequest, res: Response) {
  const bundle = await findBundleByParam(String(req.params.id || ''));
  if (!bundle) {
    return res.status(404).json({ message: 'Bundle not found.' });
  }

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : bundle.name;
  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }

  if (req.body?.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Valid price is required.' });
    }
    bundle.price = price;
  }

  if (req.body?.courseIds !== undefined) {
    const courseIds = Array.isArray(req.body.courseIds)
      ? req.body.courseIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    const coursesOk = await assertCourseIds(courseIds);
    if (!coursesOk.ok) {
      return res.status(400).json({ message: coursesOk.message });
    }
    bundle.courseIds = courseIds;
  }

  bundle.name = name;
  if (req.body?.image !== undefined) bundle.image = String(req.body.image).trim();
  if (req.body?.tagline !== undefined) bundle.tagline = String(req.body.tagline).trim();
  if (req.body?.badge !== undefined) {
    bundle.badge = String(req.body.badge).trim() || 'Popular';
  }
  if (req.body?.customCommission !== undefined) {
    bundle.customCommission = Boolean(req.body.customCommission);
  }
  if (req.body?.commissionLevels !== undefined) {
    bundle.commissionLevels = Math.min(3, Math.max(1, Number(req.body.commissionLevels) || 3));
  }
  if (req.body?.commissionPercent !== undefined) {
    bundle.commissionPercent = normalizeCommissionPercent(req.body.commissionPercent);
  }

  await bundle.save();
  return res.json({ bundle: publicBundle(bundle) });
}

export async function deleteBundle(req: AuthRequest, res: Response) {
  const bundle = await findBundleByParam(String(req.params.id || ''));
  if (!bundle) {
    return res.status(404).json({ message: 'Bundle not found.' });
  }

  await bundle.deleteOne();
  return res.json({ ok: true, slug: bundle.slug });
}
