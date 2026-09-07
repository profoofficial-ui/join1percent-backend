import mongoose, { Schema } from 'mongoose';
const courseProgressSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseSlug: { type: String, required: true, trim: true, index: true },
    completedLessonIds: { type: [String], default: [] },
    lastLessonId: { type: String, default: '' },
    lastPositionSeconds: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
courseProgressSchema.index({ userId: 1, courseSlug: 1 }, { unique: true });
export const CourseProgress = mongoose.models.CourseProgress ||
    mongoose.model('CourseProgress', courseProgressSchema);
