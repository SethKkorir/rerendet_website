// controllers/settingsController.js - COMPLETE IMPLEMENTATION
import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { getMaintenanceEmail, getMaintenanceResolvedEmail } from '../utils/emailTemplates.js';

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  try {
    console.log('🔧 Fetching settings...');

    const settings = await Settings.getSettings();

    console.log('✅ Settings fetched successfully');

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  try {
    console.log('🔧 Updating settings...', req.body);

    const settings = await Settings.getSettings();

    // Update settings with new data
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );

    console.log('✅ Settings updated successfully');


    // Handle Maintenance Mode Notification
    if (req.body.maintenance && typeof req.body.maintenance.enabled !== 'undefined') {
      const wasMaintenance = settings.maintenance.enabled;
      const isMaintenanceNow = req.body.maintenance.enabled === true || req.body.maintenance.enabled === 'true';

      if (isMaintenanceNow !== wasMaintenance) {
        console.log(`🚧 Maintenance status changed: ${wasMaintenance} -> ${isMaintenanceNow}`);

        const notifyMaintenance = async () => {
          try {
            if (isMaintenanceNow) {
              // STARTING MAINTENANCE
              console.log('🚧 Maintenance Mode ENABLED. Notifying customers...');
              const customers = await User.find({ userType: 'customer' }).select('email firstName');
              const batchSize = 10;
              for (let i = 0; i < customers.length; i += batchSize) {
                const batch = customers.slice(i, i + batchSize);
                await Promise.all(batch.map(customer =>
                  sendEmail({
                    to: customer.email,
                    subject: 'Scheduled Maintenance - Rerendet Coffee',
                    html: getMaintenanceEmail(req.body.maintenance.message || settings.maintenance.message, settings.store?.logo)
                  }).catch(err => console.error(`Failed to send to ${customer.email}`, err.message))
                ));
              }
            } else {
              // ENDING MAINTENANCE
              console.log('✅ Maintenance Mode DISABLED. Notifying customers...');
              const customers = await User.find({ userType: 'customer' }).select('email firstName');
              const batchSize = 10;
              for (let i = 0; i < customers.length; i += batchSize) {
                const batch = customers.slice(i, i + batchSize);
                await Promise.all(batch.map(customer =>
                  sendEmail({
                    to: customer.email,
                    subject: 'We are Back Online! - Rerendet Coffee',
                    html: getMaintenanceResolvedEmail(settings.store?.logo)
                  }).catch(err => console.error(`Failed to send to ${customer.email}`, err.message))
                ));
              }
            }
          } catch (error) {
            console.error('❌ Error in maintenance notification job:', error);
          }
        };

        notifyMaintenance();
      }
    }

    // Handle Policy Update Notification
    if (req.body.notifyCustomers) {
      console.log('📧 Sending policy update notification to customers...');
      // Run asynchronously to not block response
      const notifyUsers = async () => {
        try {
          const customers = await User.find({ userType: 'customer' }).select('email firstName');
          console.log(`📊 Found ${customers.length} customers to notify.`);

          if (customers.length > 0) {
            const emailPromises = customers.map(user => {
              return sendEmail({
                email: user.email,
                subject: 'Important Update: Rerendet Coffee Policies',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #6b4226;">Policy Update Notice</h1>
                    <p>Hello ${user.firstName},</p>
                    <p>We wanted to let you know that we have updated our store policies to better serve you.</p>
                    <p>Please review our latest terms and policies on our website.</p>
                    <div style="margin: 30px 0;">
                      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/privacy-policy" style="background-color: #6b4226; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Privacy Policy</a>
                    </div>
                    <p>Thank you for being a valued customer.</p>
                    <p>Best regards,<br>Rerendet Coffee Team</p>
                  </div>
                `
              });
            });

            await Promise.allSettled(emailPromises);
            console.log('✅ Bulk emails dispatched');
          }
        } catch (emailError) {
          console.error('❌ Failed to send bulk notifications:', emailError);
        }
      };

      notifyUsers();
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('❌ Update settings error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Upload logo
// @route   POST /api/admin/upload/logo
// @access  Private/Admin
const uploadLogo = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }

    console.log('📸 Logo uploaded:', req.file);

    // In a real application, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll return the file path
    const logoUrl = `/uploads/${req.file.filename}`;

    // Update settings with new logo
    const settings = await Settings.getSettings();
    settings.store.logo = logoUrl;
    await settings.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { url: logoUrl }
    });
  } catch (error) {
    console.error('❌ Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get public settings
// @route   GET /api/settings/public
// @access  Public
const getPublicSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    // Return only public information
    const publicSettings = {
      store: settings.store,
      businessHours: settings.businessHours,
      payment: {
        currency: settings.payment.currency,
        currencySymbol: settings.payment.currencySymbol,
        freeShippingThreshold: settings.payment.freeShippingThreshold,
        shippingPrice: settings.payment.shippingPrice,
        paymentMethods: settings.payment.paymentMethods
      },
      seo: settings.seo,
      policies: settings.policies,
      maintenance: settings.maintenance,
      about: settings.about
    };

    res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

export {
  getSettings,
  updateSettings,
  uploadLogo,
  getPublicSettings
};