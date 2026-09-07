import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

const lessonSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    duration: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    resourceUrl: { type: String, default: '' },
  },
  { _id: false }
);

const courseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },
    image: { type: String, default: '' },
    instructor: { type: String, default: '' },
    level: { type: String, enum: COURSE_LEVELS, default: 'Beginner' },
    duration: { type: String, default: '' },
    language: { type: String, default: 'Hindi + English' },
    category: { type: String, default: 'Digital Skills' },
    videoUrl: { type: String, default: '' },
    outcomes: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    published: { type: Boolean, default: true },
    lessons: { type: [lessonSchema], default: [] },
  },
  { timestamps: true }
);

export type CourseDocument = mongoose.HydratedDocument<InferSchemaType<typeof courseSchema>>;

export const Course: Model<CourseDocument> =
  mongoose.models.Course || mongoose.model<CourseDocument>('Course', courseSchema);
