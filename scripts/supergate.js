// scripts/supergate.js - ENTERPRISE MASTER KILL SWITCH
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models & utils (Need full paths since this is a root-executable script)
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { getMaintenanceEmail, getMaintenanceResolvedEmail } from '../utils/emailTemplates.js';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const toggleMaintenance = async () => {
    try {
        console.log('\n==========================================');
        console.log('🛡️  SUPER GATE: ENTERPRISE MASTER CONTROL');
        console.log('==========================================\n');

        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing from environment variables.');
        }

        // 1. Connect to authoritative source
        console.log('⏳ Connecting to Database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ DATABASE CONNECTED\n');

        // 2. Fetch current settings
        const settings = await Settings.findOne();
        if (!settings) throw new Error('Could not find Settings document in database.');

        const wasEnabled = settings.maintenance.enabled;
        const newState = !wasEnabled;

        console.log(`📡 Current System State: ${wasEnabled ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}`);
        console.log(`🔄 Triggering Toggle: Changing state to ${newState ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}\n`);

        // 3. Force state change
        settings.maintenance.enabled = newState;
        settings.maintenance.lastToggledAt = Date.now();

        // 4. Record Audit Trail
        settings.maintenance.history.push({
            action: newState ? 'enabled' : 'disabled',
            actorName: 'CLI OVERRIDE',
            ip: '127.0.0.1 (Server Terminal)',
            source: 'cli',
            timestamp: Date.now()
        });

        console.log('⏳ Persistenting state change...');
        await settings.save();
        console.log(`✅ SUCCESS: SYSTEM IS NOW ${newState ? 'OFFLINE' : 'ONLINE'}\n`);

        // 5. Asynchronous Email Broadcast
        console.log(`📧 Dispatching broadcast to all customers...`);
        const customers = await User.find({ userType: 'customer' }).select('email firstName');

        if (customers.length === 0) {
            console.log('ℹ️  No customers found in database. Skipping broadcast.');
        } else {
            console.log(`📊 Found ${customers.length} recipients.`);

            const batchSize = 10;
            for (let i = 0; i < customers.length; i += batchSize) {
                const batch = customers.slice(i, i + batchSize);
                await Promise.allSettled(batch.map(customer => {
                    return sendEmail({
                        to: customer.email,
                        subject: newState ? 'Scheduled Maintenance Update' : 'System Availability Restored',
                        html: newState
                            ? getMaintenanceEmail(settings.maintenance.message, settings.store?.logo)
                            : getMaintenanceResolvedEmail(settings.store?.logo)
                    }).catch(err => console.error(`   - Failed for ${customer.email}: ${err.message}`));
                }));
                console.log(`   - Batch ${Math.floor(i / batchSize) + 1} dispatched...`);
            }
            console.log('✅ BROADCAST COMPLETE\n');
        }

        console.log('==========================================');
        console.log('🔓 SUPER GATE OPERATION FINISHED');
        console.log('==========================================\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ SUPER GATE FAILURE:');
        console.error(error.message);
        console.log('\n==========================================');
        process.exit(1);
    }
};

// RUN
toggleMaintenance();
