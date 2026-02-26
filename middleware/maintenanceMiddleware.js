import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

/**
 * Middleware to check if maintenance mode is enabled.
 * Blocks all non-admin routes if enabled, except for the admin portal and specific bypasses.
 */
const maintenanceMode = asyncHandler(async (req, res, next) => {
    const fullPath = (req.baseUrl + req.path).replace(/\/$/, '');

    // 1. Always allow admin portal routes and public settings/health
    const bypassPaths = [
        '/api/admin',
        '/api/auth/admin',
        '/api/settings/public',
        '/api/health',
        '/api/auth/me'
    ];

    if (bypassPaths.some(path => fullPath.startsWith(path))) {
        return next();
    }

    // 2. Fetch settings to check if maintenance is ON
    const settings = await Settings.getSettings();
    if (!settings.maintenance || !settings.maintenance.enabled) {
        return next();
    }

    // 3. If Maintenance is ON, we must check if the user is an ADMIN
    // Since this middleware runs before 'protect', we manually check for Token
    let isAdmin = false;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('role userType');

            if (user && (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin')) {
                isAdmin = true;
                req.user = user; // Attach user so subsequent middleware knows who it is
            }
        } catch (err) {
            // Token invalid or expired, proceed as guest
        }
    }

    // 4. Block if NOT admin
    if (!isAdmin) {
        return res.status(503).json({
            success: false,
            maintenance: true,
            message: settings.maintenance.message || 'The storefront is currently offline for maintenance. Please check back later.',
            storeName: settings.store.name
        });
    }

    next();
});

export default maintenanceMode;
