import mongoose, { Schema } from 'mongoose';
const testimonialSchema = new Schema({
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: '', trim: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    quote: { type: String, required: true, trim: true },
    careerImpact: { type: String, default: '', trim: true },
    orderIndex: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
export const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
