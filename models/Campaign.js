// models/Campaign.js
import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Campaign title is required'],
        trim: true
    },
    subject: {
        type: String,
        required: [true, 'Email subject is required'],
        trim: true
    },
    content: {
        type: String,
        required: [true, 'Campaign content is required']
    },
    type: {
        type: String,
        enum: ['newsletter', 'promotion', 'announcement', 'reengagement'],
        default: 'newsletter'
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
        default: 'draft'
    },
    scheduledAt: {
        type: Date
    },
    sentAt: {
        type: Date
    },
    stats: {
        totalSent: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        opens: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        bounces: { type: Number, default: 0 },
        unsubscribes: { type: Number, default: 0 }
    },
    targetAudience: {
        type: String,
        enum: ['all', 'subscribers', 'customers', 'inactive'],
        default: 'all'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);
