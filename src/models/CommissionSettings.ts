import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const commissionSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    levels: { type: Number, required: true, min: 1, max: 3, default: 3 },
    percent: {
      type: [Number],
      required: true,
      default: [20, 10, 5],
      validate: {
        validator: (value: number[]) => Array.isArray(value) && value.length === 3,
        message: 'percent must be [level1, level2, level3]',
      },
    },
  },
  { timestamps: true }
);

export type CommissionSettingsDocument = InferSchemaType<typeof commissionSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CommissionSettings: Model<CommissionSettingsDocument> =
  mongoose.models.CommissionSettings ||
  mongoose.model<CommissionSettingsDocument>('CommissionSettings', commissionSettingsSchema);

export const DEFAULT_COMMISSION = {
  levels: 3,
  percent: [20, 10, 5] as [number, number, number],
};
