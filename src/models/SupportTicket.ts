import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const SUPPORT_STATUSES = ['open', 'in_progress', 'resolved'] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

const supportTicketSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: SUPPORT_STATUSES, default: 'open', index: true },
    adminNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export type SupportTicketDocument = InferSchemaType<typeof supportTicketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SupportTicket: Model<SupportTicketDocument> =
  mongoose.models.SupportTicket ||
  mongoose.model<SupportTicketDocument>('SupportTicket', supportTicketSchema);
