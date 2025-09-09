const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:campaigns:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT id, name, goal, description, created_at AS "createdAt", updated_at AS "updatedAt" FROM campaigns WHERE deleted_at IS NULL ORDER BY id DESC`);
        res.json(rows.map(c => ({ ...c, goal: parseFloat(c.goal) })));
    } catch (err) { 
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, goal, description } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO campaigns (name, goal, description) VALUES ($1, $2, $3) RETURNING id, name, goal, description, created_at AS "createdAt", updated_at AS "updatedAt"',
            [name, goal, description]
        );
        const newCampaign = result.rows[0];
        res.status(201).json({ ...newCampaign, goal: parseFloat(newCampaign.goal) });
    } catch (err) {
        console.error('Error adding campaign:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, goal, description } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM campaigns WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Campaign not found');

        const result = await client.query(
            'UPDATE campaigns SET name=$1, goal=$2, description=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, goal, description, created_at AS "createdAt", updated_at AS "updatedAt"',
            [name, goal, description, id]
        );
        
        await logChanges(client, {
            historyTable: 'campaigns_history',
            recordId: id,
            changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0],
            newData: req.body,
            fieldMapping: { name: 'name', goal: 'goal', description: 'description' }
        });

        await client.query('COMMIT');
        const updatedCampaign = result.rows[0];
        res.json({ ...updatedCampaign, goal: parseFloat(updatedCampaign.goal) });
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error('Failed to update campaign:', err);
        res.status(500).json({ error: 'Failed to update campaign' }); 
    } finally {
        client.release();
    }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    const { id } = req.params;
    try {
        // Check if any contributions are linked to this campaign
        const checkRes = await db.query('SELECT 1 FROM contributions WHERE campaign_id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
        if (checkRes.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot archive campaign. It is currently linked to active contributions.' });
        }
        
        // Use the generic soft delete logic if no dependencies found
        return createSoftDeleteEndpoint('campaigns')(req, res);
    } catch (err) {
        console.error('Failed to archive campaign:', err);
        res.status(500).json({ error: 'Failed to archive campaign' });
    }
});

router.get('/:id/history', authMiddleware, createHistoryEndpoint('campaigns'));

module.exports = router;
