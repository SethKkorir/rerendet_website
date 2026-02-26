import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['fixed', 'percentage'],
        required: true
    },
    discountAmount: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: 100
    },
    usedCount: {
        type: Number,
        default: 0
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Check if coupon is valid
couponSchema.methods.isValid = function () {
    const now = new Date();
    return this.isActive && now <= this.expiryDate && this.usedCount < this.usageLimit;
};

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
