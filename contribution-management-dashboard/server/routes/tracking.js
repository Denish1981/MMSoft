const express = require('express');
const { authMiddleware } = require('../auth/middleware');
const db = require('../db');
const router = express.Router();

router.post('/track-access', authMiddleware, async (req, res) => {
    const { pagePath } = req.body;
    if (!pagePath) return res.status(400).json({ error: 'pagePath is required' });
    try {
        await db.query('INSERT INTO page_access_history (user_id, page_path, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [req.user.id, pagePath, req.ip, req.headers['user-agent']]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Failed to track page access:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
