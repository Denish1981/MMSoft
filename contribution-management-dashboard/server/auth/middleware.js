const db = require('../db');

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

    const sessionRes = await db.query('SELECT user_id FROM user_sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (sessionRes.rows.length === 0) {
        return res.status(401).json({ message: 'Authentication failed: Invalid or expired token.' });
    }
    const userId = sessionRes.rows[0].user_id;

    const userRes = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
        return res.status(401).json({ message: 'Authentication failed: User not found.' });
    }
    
    const user = userRes.rows[0];
    const permissions = await getUserPermissions(userId);
    
    req.user = { id: user.id, email: user.username, permissions };
    next();
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
