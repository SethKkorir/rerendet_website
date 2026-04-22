import Contact from '../models/Contact.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import sendEmail from './sendEmail.js';
import { getFraudAlert } from './emailTemplates.js';
// TODO: Install node-cron package and enable subscription cron
// import startSubscriptionCron from '../scripts/subscriptionCron.js';

// ── Config ────────────────────────────────────────────────────────────────────
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DELETE_AGE_DAYS = 7;

// Fraud detection config
const FRAUD_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // Run every 12 hours
const FRAUD_WINDOW_HOURS = 72;    // Look at last 72 hours
const FRAUD_THRESHOLD = 3;     // 3+ failures = suspicious

// ── Contact Cleanup ───────────────────────────────────────────────────────────
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

// ── Card Fraud Detection ──────────────────────────────────────────────────────
const checkCardFraud = async () => {
    try {
        console.log('🔍 [FraudCron] Scanning for repeated payment failures...');

        const since = new Date(Date.now() - FRAUD_WINDOW_HOURS * 60 * 60 * 1000);

        // Aggregate: group by user, count their failures in the window
        const suspects = await AbandonedCheckout.aggregate([
            {
                $match: {
                    status: 'abandoned',
                    createdAt: { $gte: since }
                }
            },
            {
                $group: {
                    _id: '$user',
                    failureCount: { $sum: 1 },
                    totalAttempted: { $sum: '$totalAmount' },
                    paymentMethods: { $addToSet: '$paymentMethod' },
                    lastAttempt: { $max: '$createdAt' }
                }
            },
            {
                $match: {
                    failureCount: { $gte: FRAUD_THRESHOLD }
                }
            },
            {
                $sort: { failureCount: -1 }
            }
        ]);

        if (!suspects.length) {
            console.log('✅ [FraudCron] No suspicious payment patterns detected.');
            return;
        }

        console.warn(`⚠️ [FraudCron] ${suspects.length} user(s) flagged for suspicious payment failures!`);

        // Fetch super admin emails
        const superAdmins = await User.find({ role: 'super-admin' }).select('email firstName');
        const fallbackEmail = process.env.SUPER_ADMIN_EMAIL;

        if (!superAdmins.length && !fallbackEmail) {
            console.error('❌ [FraudCron] No super admin email found to send fraud alerts!');
            return;
        }

        const alertRecipients = superAdmins.length
            ? superAdmins.map(a => a.email)
            : [fallbackEmail];

        // Fetch logo
        let logoUrl;
        try {
            const settings = await Settings.getSettings();
            logoUrl = settings?.store?.logo;
        } catch (_) { }

        // For each suspect, send an alert
        for (const suspect of suspects) {
            try {
                // Get user info
                const user = await User.findById(suspect._id).select('firstName lastName email');
                if (!user) continue;

                // Send to all super admins
                for (const adminEmail of alertRecipients) {
                    await sendEmail({
                        to: adminEmail,
                        subject: `🕵️ Fraud Risk: ${user.firstName} ${user.lastName} — ${suspect.failureCount} payment failures`,
                        html: getFraudAlert({
                            userName: `${user.firstName} ${user.lastName}`,
                            userEmail: user.email,
                            userId: user._id.toString(),
                            failureCount: suspect.failureCount,
                            totalAttempted: suspect.totalAttempted,
                            paymentMethods: suspect.paymentMethods.filter(Boolean),
                            timeWindow: `${FRAUD_WINDOW_HOURS} hours`,
                            logoUrl
                        })
                    });

                    console.log(`📧 [FraudCron] Fraud alert sent for ${user.email} to ${adminEmail}`);
                }

            } catch (userErr) {
                console.error(`❌ [FraudCron] Error processing suspect ${suspect._id}:`, userErr.message);
            }
        }

    } catch (error) {
        console.error('❌ [FraudCron] Error during fraud check:', error);
    }
};

// ── Start All Cron Jobs ───────────────────────────────────────────────────────
export const startCronJobs = () => {
    console.log(`⏰ [Cron] System initialized. Old contacts (> ${DELETE_AGE_DAYS} days) will be auto-deleted.`);

    // Contact cleanup — run immediately then every 24h
    cleanupRepliedContacts();
    setInterval(cleanupRepliedContacts, CLEANUP_INTERVAL_MS);

    // Card fraud detection — run immediately then every 12h
    setTimeout(() => {
        checkCardFraud(); // Delay 30s on startup to let DB connect fully
        setInterval(checkCardFraud, FRAUD_CHECK_INTERVAL_MS);
    }, 30_000);

    // Subscription Engine
    // TODO: Enable when node-cron is installed
    // startSubscriptionCron();

    console.log('✅ [Cron] All jobs started: Contact Cleanup • Fraud Detection • Subscription Engine');
};

