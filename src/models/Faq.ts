import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const faqSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: 'General', trim: true },
    orderIndex: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type FaqDocument = mongoose.HydratedDocument<InferSchemaType<typeof faqSchema>>;

export const Faq: Model<FaqDocument> =
  mongoose.models.Faq || mongoose.model<FaqDocument>('Faq', faqSchema);
