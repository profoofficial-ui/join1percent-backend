import mongoose, { Schema } from 'mongoose';
const faqSchema = new Schema({
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: 'General', trim: true },
    orderIndex: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
export const Faq = mongoose.models.Faq || mongoose.model('Faq', faqSchema);
