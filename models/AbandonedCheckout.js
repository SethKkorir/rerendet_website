import mongoose from 'mongoose';

const abandonedCheckoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            name: String,
            price: Number,
            quantity: Number,
            size: String
        }
    ],
    totalAmount: Number,
    paymentMethod: String,
    failureReason: String,
    shippingAddress: Object,
    status: {
        type: String,
        enum: ['abandoned', 'recovered'],
        default: 'abandoned'
    }
}, {
    timestamps: true
});

const AbandonedCheckout = mongoose.model('AbandonedCheckout', abandonedCheckoutSchema);

export default AbandonedCheckout;
