const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT id, name, financial_year AS "financialYear", goal, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM campaigns WHERE deleted_at IS NULL ORDER BY financial_year DESC, name ASC`);
        res.json(rows.map(c => ({ ...c, goal: parseFloat(c.goal), isActive: Boolean(c.isActive) })));
    } catch (err) { 
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, goal, description, financialYear, isActive } = req.body;
    try {
        if (isActive) {
            await db.query('UPDATE campaigns SET is_active = false');
        }
        const result = await db.query(
            'INSERT INTO campaigns (name, goal, description, financial_year, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, financial_year AS "financialYear", goal, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"',
            [name, goal, description, financialYear, Boolean(isActive)]
        );
        const newCampaign = result.rows[0];
        res.status(201).json({ ...newCampaign, goal: parseFloat(newCampaign.goal), isActive: Boolean(newCampaign.isActive) });
    } catch (err) {
        console.error('Error adding campaign:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, goal, description, financialYear, isActive } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM campaigns WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Campaign not found');

        if (isActive) {
            await client.query('UPDATE campaigns SET is_active = false WHERE id != $1', [id]);
        }

        const result = await client.query(
            'UPDATE campaigns SET name=$1, goal=$2, description=$3, financial_year=$4, is_active=$5, updated_at=NOW() WHERE id=$6 RETURNING id, name, financial_year AS "financialYear", goal, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"',
            [name, goal, description, financialYear, Boolean(isActive), id]
        );
        
        await logChanges(client, {
            historyTable: 'campaigns_history',
            recordId: id,
            changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0],
            newData: req.body,
            fieldMapping: { name: 'name', goal: 'goal', description: 'description', financialYear: 'financial_year', isActive: 'is_active' }
        });

        await client.query('COMMIT');
        const updatedCampaign = result.rows[0];
        res.json({ ...updatedCampaign, goal: parseFloat(updatedCampaign.goal), isActive: Boolean(updatedCampaign.isActive) });
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
