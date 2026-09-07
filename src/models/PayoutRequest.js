import mongoose, { Schema } from 'mongoose';
export const PAYOUT_STATUSES = ['pending', 'paid', 'rejected'];
const payoutRequestSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    affiliateCode: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: PAYOUT_STATUSES, default: 'pending', index: true },
    adminNote: { type: String, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    bankSnapshot: {
        holder: { type: String, default: '' },
        bank: { type: String, default: '' },
        account: { type: String, default: '' },
        ifsc: { type: String, default: '' },
        pan: { type: String, default: '' },
    },
}, { timestamps: true });
export const PayoutRequest = mongoose.models.PayoutRequest ||
    mongoose.model('PayoutRequest', payoutRequestSchema);
