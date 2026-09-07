import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const USER_ROLES = ['admin', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true, default: 'student' },
    phone: { type: String, default: '' },
    affiliateCode: { type: String, default: '', index: true },
    sponsorCode: { type: String, default: null },
    planSlug: { type: String, default: null },
    walletBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDocument = mongoose.HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);
