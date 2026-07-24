const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:contributions:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                id, 
                donor_name AS "donorName", 
                donor_email AS "donorEmail", 
                mobile_number AS "mobileNumber", 
                tower_number AS "towerNumber", 
                flat_number AS "flatNumber", 
                amount, 
                number_of_coupons AS "numberOfCoupons", 
                campaign_id AS "campaignId", 
                date, 
                status, 
                type, 
                CASE 
                    WHEN image IS NOT NULL AND image != '' THEN CONCAT('/api/contributions/', id, '/image') 
                    ELSE NULL 
                END AS image, 
                stall_registration_id AS "stallRegistrationId", 
                created_at AS "createdAt", 
                updated_at AS "updatedAt" 
            FROM contributions 
            WHERE deleted_at IS NULL 
            ORDER BY date DESC
        `);
        res.json(rows);
    } catch (err) { 
        console.error('Error fetching contributions:', err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

router.get('/:id/image', authMiddleware, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT image FROM contributions WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (rows.length === 0 || !rows[0].image) {
            return res.status(404).json({ error: 'Image not found' });
        }
        const img = rows[0].image;
        if (typeof img === 'string' && img.startsWith('data:')) {
            const matches = img.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                const contentType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400');
                return res.send(buffer);
            }
        }
        if (typeof img === 'string' && img.startsWith('/api/')) {
            return res.redirect(img);
        }
        res.json({ image: img });
    } catch (err) {
        console.error('Error serving contribution image:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image, status } = req.body;
    
    // Check if creator is Manager or Admin (has action:edit or action:users:manage)
    const isManagerOrAdmin = req.user && req.user.permissions && (req.user.permissions.includes('action:edit') || req.user.permissions.includes('action:users:manage'));
    const contributionStatus = isManagerOrAdmin ? (status || 'Completed') : 'Pending';

    const contributionDate = date || new Date().toISOString();
    const dbCampaignId = campaignId || null;
    const userId = req.user ? req.user.id : null;
    try {
        const result = await db.query(
            `INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, contributionDate, contributionStatus, type, image, userId]
        );
        const row = result.rows[0];
        if (row.image) {
            row.image = `/api/contributions/${row.id}/image`;
        }
        res.status(201).json(row);
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
            const row = result.rows[0];
            if (row.image) {
                row.image = `/api/contributions/${row.id}/image`;
            }
            createdContributions.push(row);
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

        const oldImage = oldDataRes.rows[0].image;
        const finalImage = (image && typeof image === 'string' && image.startsWith('/api/contributions/'))
            ? oldImage
            : image;

        const result = await client.query('UPDATE contributions SET donor_name=$1, donor_email=$2, mobile_number=$3, tower_number=$4, flat_number=$5, amount=$6, number_of_coupons=$7, campaign_id=$8, date=$9, type=$10, image=$11, status=$12, updated_at=NOW() WHERE id=$13 RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"',
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId || null, date, type, finalImage, status, id]);
        
        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { donorName: 'donor_name', donorEmail: 'donor_email', mobileNumber: 'mobile_number', towerNumber: 'tower_number', flatNumber: 'flat_number', amount: 'amount', numberOfCoupons: 'number_of_coupons', campaignId: 'campaign_id', date: 'date', type: 'type', status: 'status' }
        });

        await client.query('COMMIT');
        const updatedRow = result.rows[0];
        if (updatedRow.image) {
            updatedRow.image = `/api/contributions/${updatedRow.id}/image`;
        }
        res.json(updatedRow);
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("Update contribution error:", err)
        res.status(500).json({ error: 'Failed to update contribution' }); 
    } finally { client.release(); }
});

router.put('/:id/approve', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM contributions WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Contribution not found' });
        }

        const result = await client.query(
            `UPDATE contributions SET status='Completed', updated_at=NOW() WHERE id=$1 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", 
                       tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", 
                       campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [id]
        );

        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: { ...oldDataRes.rows[0], status: 'Completed' },
            fieldMapping: { status: 'status' }
        });

        await client.query('COMMIT');
        const row = result.rows[0];
        if (row.image) {
            row.image = `/api/contributions/${row.id}/image`;
        }
        res.json(row);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Approve contribution error:", err);
        res.status(500).json({ error: 'Failed to approve contribution' });
    } finally { client.release(); }
});

router.put('/:id/reject', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM contributions WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Contribution not found' });
        }

        const result = await client.query(
            `UPDATE contributions SET status='Failed', updated_at=NOW() WHERE id=$1 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", 
                       tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", 
                       campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [id]
        );

        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: { ...oldDataRes.rows[0], status: 'Failed' },
            fieldMapping: { status: 'status' }
        });

        await client.query('COMMIT');
        const row = result.rows[0];
        if (row.image) {
            row.image = `/api/contributions/${row.id}/image`;
        }
        res.json(row);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Reject contribution error:", err);
        res.status(500).json({ error: 'Failed to reject contribution' });
    } finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('contributions'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('contributions'));

module.exports = router;
