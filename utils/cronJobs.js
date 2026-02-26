import Contact from '../models/Contact.js';
import startSubscriptionCron from '../scripts/subscriptionCron.js';

// Configuration
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check every 24 hours
const DELETE_AGE_DAYS = 7;

/**
 * Cleanup function to remove old 'replied' contacts
 */
const cleanupRepliedContacts = async () => {
    try {
        console.log('🧹 [Cron] Running automatic cleanup for replied contacts...');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DELETE_AGE_DAYS);

        const result = await Contact.deleteMany({
            status: 'replied',
            updatedAt: { $lt: cutoffDate }
        });

        if (result.deletedCount > 0) {
            console.log(`✅ [Cron] Automatically deleted ${result.deletedCount} old replied contacts.`);
        } else {
            console.log('✨ [Cron] No old replied contacts found to delete.');
        }

    } catch (error) {
        console.error('❌ [Cron] Error during contact cleanup:', error);
    }
};

/**
 * Initializes all cron jobs
 */
export const startCronJobs = () => {
    console.log(`⏰ [Cron] System initialized. Old contacts (> ${DELETE_AGE_DAYS} days) will be auto-deleted.`);

    // Run contact cleanup
    cleanupRepliedContacts();
    setInterval(cleanupRepliedContacts, CLEANUP_INTERVAL_MS);

    // Start Subscription Engine
    startSubscriptionCron();
    console.log('✅ [Cron] Subscription Engine Active.');
};
