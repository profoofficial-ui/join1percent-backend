import mongoose, { Schema } from 'mongoose';
export const SUPPORT_STATUSES = ['open', 'in_progress', 'resolved'];
const supportTicketSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: SUPPORT_STATUSES, default: 'open', index: true },
    adminNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
export const SupportTicket = mongoose.models.SupportTicket ||
    mongoose.model('SupportTicket', supportTicketSchema);
