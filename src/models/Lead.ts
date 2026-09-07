import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, default: '', trim: true },
    message: { type: String, default: '', trim: true },
    source: { type: String, default: 'popup', index: true },
  },
  { timestamps: true }
);

export type LeadDocument = mongoose.HydratedDocument<InferSchemaType<typeof leadSchema>>;

export const Lead: Model<LeadDocument> =
  mongoose.models.Lead || mongoose.model<LeadDocument>('Lead', leadSchema);
