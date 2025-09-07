const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:archive:view'), async (req, res) => {
    try {
        const tables = ['contributions', 'sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'tasks', 'events'];
        const nameColumns = {
            contributions: 'donor_name', sponsors: 'name', vendors: 'name',
            expenses: 'name', quotations: 'quotation_for', budgets: 'item_name',
            festivals: 'name', tasks: 'title', events: 'name'
        };
        let archivedItems = [];

        for (const table of tables) {
            const query = `SELECT id, ${nameColumns[table]} AS name, deleted_at FROM ${table} WHERE deleted_at IS NOT NULL`;
            const { rows } = await db.query(query);
            rows.forEach(row => {
                archivedItems.push({
                    id: row.id,
                    name: row.name,
                    deletedAt: row.deleted_at,
                    type: table
                });
            });
        }
        archivedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
        res.json(archivedItems);
    } catch (err) {
        console.error('Error fetching archive:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:recordType/:id/restore', authMiddleware, permissionMiddleware('action:restore'), async (req, res) => {
    const { recordType, id } = req.params;
    const allowedTypes = ['contributions', 'sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'tasks', 'events'];
    
    if (!allowedTypes.includes(recordType)) {
        return res.status(400).json({ error: 'Invalid record type for restoration.' });
    }

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE ${recordType} SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`, [id]);
        if (updateRes.rowCount === 0) {
            return res.status(404).json({ error: 'Item not found or not archived.' });
        }
        
        await client.query(
            `INSERT INTO ${recordType}_history (record_id, field_changed, old_value, new_value, changed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
            [id, 'status', 'archived', 'active', req.user.id]
        );
        
        await client.query('COMMIT');
        res.status(200).json({ message: 'Item restored successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error restoring ${recordType}:`, err);
        res.status(500).json({ error: 'Failed to restore item.' });
    } finally {
        client.release();
    }
});

module.exports = router;
