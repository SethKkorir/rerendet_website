import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        size: String,
        price: Number // Locked price at time of subscription
    }],
    frequency: {
        type: String,
        enum: ['weekly', 'bi-weekly', 'monthly'],
        default: 'monthly'
    },
    discount: {
        type: Number,
        default: 5 // 5% default discount
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled'],
        default: 'active'
    },
    nextBillingDate: {
        type: Date,
        required: true
    },
    lastBillingDate: {
        type: Date
    },
    shippingAddress: {
        type: Object,
        required: true
    },
    paymentMethod: {
        type: String,
        default: 'mpesa'
    }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
