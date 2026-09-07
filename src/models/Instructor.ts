import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const instructorSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    avatarUrl: { type: String, default: '', trim: true },
    studentsCount: { type: Number, default: 0 },
    coursesCount: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    orderIndex: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type InstructorDocument = mongoose.HydratedDocument<InferSchemaType<typeof instructorSchema>>;

export const Instructor: Model<InstructorDocument> =
  mongoose.models.Instructor || mongoose.model<InstructorDocument>('Instructor', instructorSchema);
