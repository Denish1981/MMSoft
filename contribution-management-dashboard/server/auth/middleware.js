const db = require('../db');

const sessionCache = new Map();

const getUserPermissions = async (userId) => {
    const { rows } = await db.query(
        `SELECT DISTINCT p.name FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
    );
    return rows.map(r => r.name);
};

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required: No token provided.' });
    }
    const token = authHeader.split(' ')[1];

    const now = Date.now();
    const cached = sessionCache.get(token);
    if (cached && cached.expires > now) {
        req.user = cached.user;
        return next();
    }

    try {
        const { rows } = await db.query(
            `SELECT u.id, u.username, ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) AS permissions
             FROM user_sessions s
             JOIN users u ON u.id = s.user_id
             LEFT JOIN user_roles ur ON ur.user_id = u.id
             LEFT JOIN role_permissions rp ON rp.role_id = ur.role_id
             LEFT JOIN permissions p ON p.id = rp.permission_id
             WHERE s.token = $1 AND s.expires_at > NOW()
             GROUP BY u.id, u.username`,
            [token]
        );

        if (rows.length === 0) {
            sessionCache.delete(token);
            return res.status(401).json({ message: 'Authentication failed: Invalid or expired token.' });
        }

        const user = rows[0];
        const userObj = { id: user.id, email: user.username, permissions: user.permissions || [] };

        sessionCache.set(token, { user: userObj, expires: now + 30000 });

        req.user = userObj;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ message: 'Internal server error during authentication.' });
    }
};

const permissionMiddleware = (permission) => (req, res, next) => {
    if (!req.user || !req.user.permissions) {
        return res.status(403).json({ message: 'Forbidden: No permissions found for user.' });
    }
    // Admin role (defined by 'action:users:manage' permission) has all rights.
    if (req.user.permissions.includes('action:users:manage')) {
        return next();
    }
    if (!req.user.permissions.includes(permission)) {
        return res.status(403).json({ message: `Forbidden: Lacks '${permission}' permission.` });
    }
    next();
};

module.exports = { authMiddleware, permissionMiddleware, getUserPermissions };
