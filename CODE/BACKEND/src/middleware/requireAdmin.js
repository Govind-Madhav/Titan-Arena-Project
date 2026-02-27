/**
 * Middleware: requireAdmin
 * Restricts access to ADMIN and SUPERADMIN roles only.
 * Must be used after the main auth middleware (requireAuth).
 */
const requireAdmin = (req, res, next) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!user.isAdmin && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    next();
};

module.exports = requireAdmin;
