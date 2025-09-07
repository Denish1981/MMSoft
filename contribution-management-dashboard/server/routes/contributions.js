const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:contributions:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt" FROM contributions WHERE deleted_at IS NULL ORDER BY date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image, status } = req.body;
    const contributionStatus = status || 'Completed';
    const contributionDate = date || new Date().toISOString();
    const dbCampaignId = campaignId || null;
    try {
        const result = await db.query(
            `INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, contributionDate, contributionStatus, type, image]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { 
        console.error('Error adding contribution:', err); 
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

router.post('/bulk', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { contributions } = req.body;
    if (!contributions || !Array.isArray(contributions) || contributions.length === 0) {
        return res.status(400).json({ error: 'Contributions array is required.' });
    }
    const client = await db.getPool().connect();
    const createdContributions = [];
    try {
        await client.query('BEGIN');
        for (const c of contributions) {
            const contributionStatus = c.status || 'Completed';
            const contributionDate = c.date || new Date().toISOString();
            const dbCampaignId = c.campaignId || null;
            const result = await client.query(`
                INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"
            `, [c.donorName, c.donorEmail, c.mobileNumber, c.towerNumber, c.flatNumber, c.amount, c.numberOfCoupons, dbCampaignId, contributionDate, contributionStatus, c.type, c.image]);
            createdContributions.push(result.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(createdContributions);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during bulk contribution insert:', err);
        res.status(500).json({ error: 'Internal server error during bulk insert' });
    } finally {
        client.release();
    }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image, status } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM contributions WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Contribution not found');

        const result = await client.query('UPDATE contributions SET donor_name=$1, donor_email=$2, mobile_number=$3, tower_number=$4, flat_number=$5, amount=$6, number_of_coupons=$7, campaign_id=$8, date=$9, type=$10, image=$11, status=$12, updated_at=NOW() WHERE id=$13 RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"',
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId || null, date, type, image, status, id]);
        
        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { donorName: 'donor_name', donorEmail: 'donor_email', mobileNumber: 'mobile_number', towerNumber: 'tower_number', flatNumber: 'flat_number', amount: 'amount', numberOfCoupons: 'number_of_coupons', campaignId: 'campaign_id', date: 'date', type: 'type', status: 'status' }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("Update contribution error:", err)
        res.status(500).json({ error: 'Failed to update contribution' }); 
    } finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('contributions'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('contributions'));

module.exports = router;
