import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    entityId: {
        type: String, // The ID of the thing being changed (Product ID, User ID etc)
    },
    entityName: {
        type: String, // Human readable name (e.g. "Kenyan Gold Beans")
    },
    details: {
        type: Object, // Flexible JSON for before/after values
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Index for fast sorting/searching
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ admin: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
