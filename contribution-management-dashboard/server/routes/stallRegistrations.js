const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');

const router = express.Router();

// DELETE a single stall registration
router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM stall_registrations WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Stall registration not found.' });
        }
        res.status(204).send(); // No Content
    } catch (err) {
        console.error(`Error deleting stall registration ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
