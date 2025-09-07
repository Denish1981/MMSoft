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
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT id, username FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const permissions = await getUserPermissions(user.id);
            if (permissions.length === 0) return res.status(403).json({ message: 'Login failed. Your account has not been assigned any roles.' });
            
            const token = await createSession(user.id);
            await logLoginHistory(user.id, 'password', req);
            res.status(200).json({ user: { id: user.id, email: user.username, permissions }, token });
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

        const userResult = await db.query('SELECT id, username FROM users WHERE username = $1', [email]);
        if (userResult.rows.length === 0) return res.status(403).json({ message: 'Access denied. Your account has not been set up by an administrator.' });

        const user = userResult.rows[0];
        const permissions = await getUserPermissions(user.id);
        if (permissions.length === 0) return res.status(403).json({ message: 'Access denied. Your account has no assigned roles.' });

        const sessionToken = await createSession(user.id);
        await logLoginHistory(user.id, 'google', req);
        res.status(200).json({ user: { id: user.id, email: user.username, permissions }, token: sessionToken });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

router.get('/me', authMiddleware, (req, res) => {
    res.status(200).json({ user: req.user });
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

module.exports = router;
