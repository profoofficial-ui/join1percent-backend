import mongoose, { Schema } from 'mongoose';
const leadSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, default: '', trim: true },
    message: { type: String, default: '', trim: true },
    source: { type: String, default: 'popup', index: true },
}, { timestamps: true });
export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
