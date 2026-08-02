const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint, serveImageString, logManagerApproval } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:contributions:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                c.id, 
                c.donor_name AS "donorName", 
                c.donor_email AS "donorEmail", 
                c.mobile_number AS "mobileNumber", 
                c.tower_number AS "towerNumber", 
                c.flat_number AS "flatNumber", 
                c.amount, 
                c.number_of_coupons AS "numberOfCoupons", 
                COALESCE(c.coupons_collected, 0) AS "couponsCollected",
                c.date_collected AS "dateCollected",
                COALESCE(c.coupons_used, 0) AS "couponsUsed",
                c.festival_id AS "festivalId",
                COALESCE(c.campaign_id, f.campaign_id) AS "campaignId", 
                c.date, 
                c.status, 
                c.type, 
                CASE 
                    WHEN c.image IS NOT NULL AND c.image != '' THEN 
                        CASE 
                            WHEN c.image LIKE '/api/%' OR c.image LIKE 'http://%' OR c.image LIKE 'https://%' THEN c.image 
                            ELSE CONCAT('/api/contributions/', c.id, '/image') 
                        END 
                    ELSE NULL 
                END AS image, 
                c.stall_registration_id AS "stallRegistrationId", 
                c.created_at AS "createdAt", 
                c.updated_at AS "updatedAt" 
            FROM contributions c
            LEFT JOIN festivals f ON c.festival_id = f.id
            WHERE c.deleted_at IS NULL 
            ORDER BY c.date DESC
        `);
        res.json(rows);
    } catch (err) { 
        console.error('Error fetching contributions:', err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

router.get('/:id/image', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT image FROM contributions WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (rows.length === 0 || !rows[0].image) {
            return res.status(404).json({ error: 'Image not found' });
        }
        return serveImageString(rows[0].image, res);
    } catch (err) {
        console.error('Error serving contribution image:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, festivalId, campaignId, date, type, image, status } = req.body;
    
    // Check if creator is Manager or Admin (has action:edit or action:users:manage)
    const isManagerOrAdmin = req.user && req.user.permissions && (req.user.permissions.includes('action:edit') || req.user.permissions.includes('action:users:manage'));
    const contributionStatus = isManagerOrAdmin ? (status || 'Completed') : 'Pending';

    const contributionDate = date || new Date().toISOString();
    let dbFestivalId = festivalId || null;
    let dbCampaignId = campaignId || null;

    if (dbFestivalId && !dbCampaignId) {
        const festRes = await db.query('SELECT campaign_id FROM festivals WHERE id = $1', [dbFestivalId]);
        if (festRes.rows.length > 0) {
            dbCampaignId = festRes.rows[0].campaign_id;
        }
    }

    const userId = req.user ? req.user.id : null;

    let dbTowerNumber = towerNumber;
    let dbFlatNumber = flatNumber;
    try {
        if (userId) {
            const userRes = await db.query('SELECT tower_number, flat_number, mobile_number, full_name FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                if (!dbTowerNumber) dbTowerNumber = userRes.rows[0].tower_number;
                if (!dbFlatNumber) dbFlatNumber = userRes.rows[0].flat_number;
            }

            // Save supplied profile info to user account for future auto-fills
            if (towerNumber || flatNumber || mobileNumber || donorName) {
                await db.query(
                    `UPDATE users SET 
                        tower_number = COALESCE(NULLIF($1, ''), tower_number),
                        flat_number = COALESCE(NULLIF($2, ''), flat_number),
                        mobile_number = COALESCE(NULLIF($3, ''), mobile_number),
                        full_name = CASE WHEN $4 != '' AND $4 NOT LIKE '%@%' THEN $4 ELSE full_name END
                     WHERE id = $5`,
                    [towerNumber || '', flatNumber || '', mobileNumber || '', donorName || '', userId]
                );
            }
        }

        // Clamp number_of_coupons to max 4 on server side
        const clampedCoupons = Math.min(4, Math.max(0, parseInt(numberOfCoupons, 10) || 0));

        const result = await db.query(
            `INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, festival_id, campaign_id, date, status, type, image, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", festival_id AS "festivalId", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [donorName, donorEmail, mobileNumber, dbTowerNumber, dbFlatNumber, amount, clampedCoupons, dbFestivalId, dbCampaignId, contributionDate, contributionStatus, type, image, userId]
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
            let dbFestivalId = c.festivalId || null;
            let dbCampaignId = c.campaignId || null;
            if (dbFestivalId && !dbCampaignId) {
                const festRes = await client.query('SELECT campaign_id FROM festivals WHERE id = $1', [dbFestivalId]);
                if (festRes.rows.length > 0) {
                    dbCampaignId = festRes.rows[0].campaign_id;
                }
            }

            const clampedCoupons = Math.min(4, Math.max(0, parseInt(c.numberOfCoupons, 10) || 0));

            const result = await client.query(`
                INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, festival_id, campaign_id, date, status, type, image) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
                RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", festival_id AS "festivalId", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"
            `, [c.donorName, c.donorEmail, c.mobileNumber, c.towerNumber, c.flatNumber, c.amount, clampedCoupons, dbFestivalId, dbCampaignId, contributionDate, contributionStatus, c.type, c.image]);
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
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, festivalId, campaignId, date, type, image, status } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM contributions WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Contribution not found');

        const oldImage = oldDataRes.rows[0].image;
        const finalImage = (image && typeof image === 'string' && image.startsWith('/api/'))
            ? oldImage
            : image;

        let dbFestivalId = festivalId || oldDataRes.rows[0].festival_id || null;
        let dbCampaignId = campaignId || oldDataRes.rows[0].campaign_id || null;
        if (dbFestivalId && !dbCampaignId) {
            const festRes = await client.query('SELECT campaign_id FROM festivals WHERE id = $1', [dbFestivalId]);
            if (festRes.rows.length > 0) {
                dbCampaignId = festRes.rows[0].campaign_id;
            }
        }

        const clampedCoupons = Math.min(4, Math.max(0, parseInt(numberOfCoupons, 10) || 0));

        const result = await client.query('UPDATE contributions SET donor_name=$1, donor_email=$2, mobile_number=$3, tower_number=$4, flat_number=$5, amount=$6, number_of_coupons=$7, festival_id=$8, campaign_id=$9, date=$10, type=$11, image=$12, status=$13, updated_at=NOW() WHERE id=$14 RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", festival_id AS "festivalId", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"',
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, clampedCoupons, dbFestivalId, dbCampaignId, date, type, finalImage, status, id]);
        
        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { donorName: 'donor_name', donorEmail: 'donor_email', mobileNumber: 'mobile_number', towerNumber: 'tower_number', flatNumber: 'flat_number', amount: 'amount', numberOfCoupons: 'number_of_coupons', festivalId: 'festival_id', campaignId: 'campaign_id', date: 'date', type: 'type', status: 'status' }
        });

        if (oldDataRes.rows[0].status !== 'Completed' && oldDataRes.rows[0].status !== 'Approved' && (status === 'Completed' || status === 'Approved')) {
            await logManagerApproval(client, {
                userId: req.user.id,
                entityType: 'Contribution',
                entityId: id,
                action: 'Approved',
                details: {
                    donorName: donorName || oldDataRes.rows[0].donor_name,
                    amount: amount || oldDataRes.rows[0].amount,
                    status: status,
                    type: type || oldDataRes.rows[0].type,
                    festivalId: dbFestivalId,
                    campaignId: dbCampaignId
                }
            });
        }

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

        await logManagerApproval(client, {
            userId: req.user.id,
            entityType: 'Contribution',
            entityId: id,
            action: 'Approved',
            details: {
                donorName: oldDataRes.rows[0].donor_name,
                amount: oldDataRes.rows[0].amount,
                status: 'Completed',
                type: oldDataRes.rows[0].type,
                festivalId: oldDataRes.rows[0].festival_id,
                campaignId: oldDataRes.rows[0].campaign_id
            }
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

router.put('/:id/coupons', authMiddleware, permissionMiddleware('page:food-coupons:view'), async (req, res) => {
    const { id } = req.params;
    const { couponsCollected, dateCollected, couponsUsed } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM contributions WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Contribution not found' });
        }

        const collectedNum = couponsCollected !== undefined && couponsCollected !== null && couponsCollected !== '' ? parseInt(couponsCollected) : 0;
        const usedNum = couponsUsed !== undefined && couponsUsed !== null && couponsUsed !== '' ? parseInt(couponsUsed) : 0;
        const colDate = dateCollected ? dateCollected : null;

        const result = await client.query(
            `UPDATE contributions 
             SET coupons_collected=$1, date_collected=$2, coupons_used=$3, updated_at=NOW() 
             WHERE id=$4 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", 
                       tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", 
                       COALESCE(coupons_collected, 0) AS "couponsCollected", date_collected AS "dateCollected", COALESCE(coupons_used, 0) AS "couponsUsed",
                       festival_id AS "festivalId", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [collectedNum, colDate, usedNum, id]
        );

        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: { ...oldDataRes.rows[0], coupons_collected: collectedNum, date_collected: colDate, coupons_used: usedNum },
            fieldMapping: { couponsCollected: 'coupons_collected', dateCollected: 'date_collected', couponsUsed: 'coupons_used' }
        });

        await client.query('COMMIT');
        const row = result.rows[0];
        if (row.image) {
            row.image = `/api/contributions/${row.id}/image`;
        }
        res.json(row);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating coupons:', err);
        res.status(500).json({ error: 'Failed to update coupons' });
    } finally {
        client.release();
    }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('contributions'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('contributions'));

module.exports = router;
