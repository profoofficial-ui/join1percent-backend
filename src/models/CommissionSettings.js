import mongoose, { Schema } from 'mongoose';
const commissionSettingsSchema = new Schema({
    key: { type: String, required: true, unique: true, default: 'default' },
    levels: { type: Number, required: true, min: 1, max: 3, default: 3 },
    percent: {
        type: [Number],
        required: true,
        default: [20, 10, 5],
        validate: {
            validator: (value) => Array.isArray(value) && value.length === 3,
            message: 'percent must be [level1, level2, level3]',
        },
    },
}, { timestamps: true });
export const CommissionSettings = mongoose.models.CommissionSettings ||
    mongoose.model('CommissionSettings', commissionSettingsSchema);
export const DEFAULT_COMMISSION = {
    levels: 3,
    percent: [20, 10, 5],
};
