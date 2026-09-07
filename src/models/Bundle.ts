import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const bundleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    courseIds: { type: [String], default: [] },
    tagline: { type: String, default: '' },
    badge: { type: String, default: 'Popular' },
    /** When true, use commissionLevels/percent instead of universal settings */
    customCommission: { type: Boolean, default: false },
    commissionLevels: { type: Number, min: 1, max: 3, default: 3 },
    commissionPercent: { type: [Number], default: [20, 10, 5] },
  },
  { timestamps: true }
);

export type BundleDocument = mongoose.HydratedDocument<InferSchemaType<typeof bundleSchema>>;

export const Bundle: Model<BundleDocument> =
  mongoose.models.Bundle || mongoose.model<BundleDocument>('Bundle', bundleSchema);
