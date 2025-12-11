/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

/**
 * Role-based access control middleware
 */

/**
 * Require specific roles
 * @param {string[]} roles - Array of allowed roles
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Require ADMIN or SUPERADMIN role
 */
const requireAdmin = () => requireRole(['ADMIN', 'SUPERADMIN']);

/**
 * Require SUPERADMIN role only
 */
const requireSuperAdmin = () => requireRole(['SUPERADMIN']);

/**
 * Require user to be a verified host
 */
const requireVerifiedHost = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Admins can bypass host verification
    if (['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
        return next();
    }

    if (req.user.hostStatus !== 'VERIFIED') {
        return res.status(403).json({
            success: false,
            message: 'Host verification required. Please complete KYC.',
            hostStatus: req.user.hostStatus
        });
    }

    next();
};

/**
 * Require user to NOT be banned
 */
const requireNotBanned = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.isBanned) {
        return res.status(403).json({
            success: false,
            message: 'Your account has been banned. Contact support for assistance.'
        });
    }

    next();
};

module.exports = {
    requireRole,
    requireAdmin,
    requireSuperAdmin,
    requireVerifiedHost,
    requireNotBanned
};
