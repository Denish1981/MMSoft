const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:campaigns:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT id, name, goal, description, created_at AS "createdAt", updated_at AS "updatedAt" FROM campaigns WHERE deleted_at IS NULL ORDER BY id DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
