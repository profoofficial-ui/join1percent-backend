import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const walletTxnSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    affiliateCode: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    level: { type: Number, required: false, min: 0, max: 3, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    percent: { type: Number, required: false, min: 0, default: 0 },
    status: { type: String, enum: ['Credit', 'Debit'], required: true, default: 'Credit' },
    type: { type: String, required: true },
    category: {
      type: String,
      enum: ['commission', 'payout', 'adjustment', 'bonus', 'other'],
      default: 'commission',
    },
    adminNote: { type: String, default: '' },
    balanceAfter: { type: Number, default: 0 },
    buyerName: { type: String, default: '' },
    buyerEmail: { type: String, default: '' },
    bundleSlug: { type: String, default: '' },
    bundleName: { type: String, default: '' },
  },
  { timestamps: true }
);

walletTxnSchema.index({ orderId: 1, userId: 1, level: 1 }, { unique: true });

export type WalletTxnDocument = InferSchemaType<typeof walletTxnSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export const WalletTxn: Model<WalletTxnDocument> =
  mongoose.models.WalletTxn || mongoose.model<WalletTxnDocument>('WalletTxn', walletTxnSchema);
