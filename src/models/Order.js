import mongoose, { Schema } from 'mongoose';
export const PAYMENT_METHODS = ['UPI', 'Card', 'NetBanking', 'Razorpay'];
export const ORDER_STATUSES = ['pending', 'paid', 'failed'];
const orderSchema = new Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    state: { type: String, default: '' },
    bundleSlug: { type: String, required: true, index: true },
    bundleName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Razorpay' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    sponsorCode: { type: String, default: null },
    razorpayOrderId: { type: String, default: '', index: true },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    paidAt: { type: Date, default: null },
}, { timestamps: true });
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
