import mongoose, { Schema } from 'mongoose';
export const KYC_STATUSES = ['pending', 'approved', 'rejected'];
const kycSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    holder: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    account: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true, uppercase: true },
    pan: { type: String, required: true, trim: true, uppercase: true },
    aadhaar: { type: String, required: true, trim: true },
    status: { type: String, enum: KYC_STATUSES, default: 'pending', index: true },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
export const KycSubmission = mongoose.models.KycSubmission || mongoose.model('KycSubmission', kycSchema);
