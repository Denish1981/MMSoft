const express = require('express');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { authMiddleware, getUserPermissions } = require('./middleware');

const router = express.Router();
const googleClient = new OAuth2Client();

// --- Helper Functions ---
const logLoginHistory = async (userId, method, req) => {
    try {
        await db.query(
            'INSERT INTO login_history (user_id, login_method, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [userId, method, req.ip, req.headers['user-agent']]
        );
    } catch (err) {
        console.error('Failed to log login history:', err);
    }
};

const createSession = async (userId) => {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Session valid for 1 day

    await db.query('INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
    return token;
};

// --- Routes ---
router.post('/register', async (req, res) => {
    const { username, password, fullName, mobileNumber, towerNumber, flatNumber } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required.' });
    }
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'An account with this email/username already exists.' });
        }
        const newUserRes = await client.query(
            'INSERT INTO users (username, password, full_name, mobile_number, tower_number, flat_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [username, password, fullName || null, mobileNumber || null, towerNumber || null, flatNumber || null]
        );
        const userId = newUserRes.rows[0].id;
        
        // Find 'Donor' role ID
        const roleRes = await client.query("SELECT id FROM roles WHERE name = 'Donor'");
        let roleId = roleRes.rows[0]?.id;
        if (!roleId) {
            const viewerRes = await client.query("SELECT id FROM roles WHERE name = 'Viewer'");
            roleId = viewerRes.rows[0]?.id;
        }
        if (roleId) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
        }
        await client.query('COMMIT');

        const token = await createSession(userId);
        const permissions = await getUserPermissions(userId);
        await logLoginHistory(userId, 'registration', req);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: userId,
                email: username,
                fullName: fullName || '',
                mobileNumber: mobileNumber || '',
                towerNumber: towerNumber || '',
                flatNumber: flatNumber || '',
                permissions
            },
            token
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query(
            'SELECT id, username, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber" FROM users WHERE username = $1 AND password = $2', 
            [username, password]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const permissions = await getUserPermissions(user.id);
            if (permissions.length === 0) return res.status(403).json({ message: 'Login failed. Your account has not been assigned any roles.' });
            
            const token = await createSession(user.id);
            await logLoginHistory(user.id, 'password', req);
            res.status(200).json({ 
                user: { 
                    id: user.id, 
                    email: user.username, 
                    fullName: user.fullName || '',
                    mobileNumber: user.mobileNumber || '',
                    towerNumber: user.towerNumber || '',
                    flatNumber: user.flatNumber || '',
                    permissions 
                }, 
                token 
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload?.email;
        if (!email) return res.status(400).json({ message: 'Invalid Google token: email not found.' });

        const userResult = await db.query(
            'SELECT id, username, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber" FROM users WHERE username = $1', 
            [email]
        );
        let user;
        if (userResult.rows.length === 0) {
            // Auto-register Google user as Donor
            const client = await db.getPool().connect();
            try {
                await client.query('BEGIN');
                const newUserRes = await client.query(
                    'INSERT INTO users (username, full_name) VALUES ($1, $2) RETURNING id',
                    [email, payload.name || '']
                );
                const userId = newUserRes.rows[0].id;
                const roleRes = await client.query("SELECT id FROM roles WHERE name = 'Donor'");
                let roleId = roleRes.rows[0]?.id;
                if (!roleId) {
                    const viewerRes = await client.query("SELECT id FROM roles WHERE name = 'Viewer'");
                    roleId = viewerRes.rows[0]?.id;
                }
                if (roleId) {
                    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
                }
                await client.query('COMMIT');
                user = { id: userId, username: email, fullName: payload.name || '', mobileNumber: '', towerNumber: '', flatNumber: '' };
            } catch (createErr) {
                await client.query('ROLLBACK');
                throw createErr;
            } finally {
                client.release();
            }
        } else {
            user = userResult.rows[0];
        }

        const permissions = await getUserPermissions(user.id);
        if (permissions.length === 0) return res.status(403).json({ message: 'Access denied. Your account has no assigned roles.' });

        const sessionToken = await createSession(user.id);
        await logLoginHistory(user.id, 'google', req);
        res.status(200).json({ 
            user: { 
                id: user.id, 
                email: user.username, 
                fullName: user.fullName || '',
                mobileNumber: user.mobileNumber || '',
                towerNumber: user.towerNumber || '',
                flatNumber: user.flatNumber || '',
                permissions 
            }, 
            token: sessionToken 
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userRes = await db.query(
            'SELECT full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber" FROM users WHERE id = $1',
            [req.user.id]
        );
        const userDetails = userRes.rows[0] || {};
        res.status(200).json({
            user: {
                ...req.user,
                fullName: userDetails.fullName || '',
                mobileNumber: userDetails.mobileNumber || '',
                towerNumber: userDetails.towerNumber || '',
                flatNumber: userDetails.flatNumber || ''
            }
        });
    } catch (err) {
        res.status(200).json({ user: req.user });
    }
});

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        await db.query('DELETE FROM user_sessions WHERE token = $1', [token]);
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Internal server error during logout.' });
    }
});

router.post('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
    }

    try {
        const userId = req.user.id;
        
        // Fetch user password
        const userRes = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const storedPassword = userRes.rows[0].password;
        
        // If they have an existing password, verify it
        if (storedPassword && storedPassword !== currentPassword) {
            return res.status(400).json({ message: 'The current password you entered is incorrect.' });
        }
        
        // Update user password
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, userId]);
        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
