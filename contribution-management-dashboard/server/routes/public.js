
const express = require('express');
const db = require('../db');
const router = express.Router();

const getUserIdFromReq = async (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.split(' ')[1];
        const sessionRes = await db.query('SELECT user_id FROM user_sessions WHERE token = $1 AND expires_at > NOW()', [token]);
        return sessionRes.rows.length > 0 ? sessionRes.rows[0].user_id : null;
    } catch {
        return null;
    }
};

const checkApprovedContribution = async ({ userId, towerNumber, flatNumber, email, mobileNumber }) => {
    try {
        let userTower = towerNumber ? String(towerNumber).trim() : null;
        let userFlat = flatNumber ? String(flatNumber).trim() : null;
        let userEmail = email ? String(email).trim() : null;
        let userMobile = mobileNumber ? String(mobileNumber).trim() : null;

        if (userId) {
            const userRes = await db.query('SELECT username, mobile_number, tower_number, flat_number FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
                const u = userRes.rows[0];
                if (!userEmail && u.username) userEmail = String(u.username).trim();
                if (!userMobile && u.mobile_number) userMobile = String(u.mobile_number).trim();
                if (!userTower && u.tower_number) userTower = String(u.tower_number).trim();
                if (!userFlat && u.flat_number) userFlat = String(u.flat_number).trim();
            }
        }

        let conditions = [];
        let params = [];
        let paramIdx = 1;

        if (userId) {
            conditions.push(`c.user_id = $${paramIdx++}`);
            params.push(userId);
        }

        if (userTower && userFlat) {
            conditions.push(`(
                (
                    (LOWER(TRIM(c.tower_number)) = LOWER(TRIM($${paramIdx})) AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($${paramIdx + 1})))
                    OR (REPLACE(LOWER(TRIM(c.tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($${paramIdx})), 'tower', '') AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($${paramIdx + 1})))
                    OR (REGEXP_REPLACE(LOWER(c.tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($${paramIdx}), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(c.flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($${paramIdx + 1}), '[^0-9a-z]', '', 'g'))
                )
                OR c.user_id IN (
                    SELECT id FROM users 
                    WHERE (LOWER(TRIM(tower_number)) = LOWER(TRIM($${paramIdx})) AND LOWER(TRIM(flat_number)) = LOWER(TRIM($${paramIdx + 1})))
                       OR (REPLACE(LOWER(TRIM(tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($${paramIdx})), 'tower', '') AND LOWER(TRIM(flat_number)) = LOWER(TRIM($${paramIdx + 1})))
                       OR (REGEXP_REPLACE(LOWER(tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($${paramIdx}), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($${paramIdx + 1}), '[^0-9a-z]', '', 'g'))
                )
            )`);
            params.push(userTower, userFlat);
            paramIdx += 2;
        }

        if (userEmail) {
            conditions.push(`(
                LOWER(TRIM(c.donor_email)) = LOWER(TRIM($${paramIdx})) 
                OR c.user_id IN (SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($${paramIdx})))
            )`);
            params.push(userEmail);
            paramIdx++;
        }

        if (userMobile) {
            conditions.push(`(
                c.mobile_number = $${paramIdx} 
                OR REPLACE(c.mobile_number, ' ', '') = REPLACE($${paramIdx}, ' ', '')
                OR c.user_id IN (SELECT id FROM users WHERE mobile_number = $${paramIdx} OR REPLACE(mobile_number, ' ', '') = REPLACE($${paramIdx}, ' ', ''))
            )`);
            params.push(userMobile);
            paramIdx++;
        }

        if (conditions.length === 0) {
            return false;
        }

        const query = `
            SELECT 1 FROM contributions c
            WHERE c.deleted_at IS NULL 
              AND c.status IN ('Approved', 'Completed') 
              AND (${conditions.join(' OR ')})
            LIMIT 1
        `;

        const { rows } = await db.query(query, params);
        return rows.length > 0;
    } catch (err) {
        console.error('Error in checkApprovedContribution:', err);
        return false;
    }
};

router.get('/public/events', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, name, description, event_date as "eventDate", start_time as "startTime", end_time as "endTime", venue, registration_form_schema as "registrationFormSchema" 
            FROM events 
            WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE 
            ORDER BY event_date ASC, start_time ASC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch public events' }); }
});

router.post('/public/events/:id/register', async (req, res) => {
    const { id } = req.params;
    const { formData, paymentProofImage } = req.body;
    
    if (!formData || !formData.name || (!formData.phone_number && !formData.mobile_number && !formData.contact_number && !formData.phone)) {
        return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    try {
        const userId = await getUserIdFromReq(req);

        const towerNumber = formData.tower_number || formData.towerNumber || formData.tower || null;
        const flatNumber = formData.flat_number || formData.flatNumber || formData.flat || null;
        const email = formData.email || formData.donor_email || null;
        const mobileNumber = formData.phone_number || formData.mobile_number || formData.contact_number || formData.phone || null;

        const hasApproved = await checkApprovedContribution({
            userId,
            towerNumber: towerNumber ? String(towerNumber).trim() : null,
            flatNumber: flatNumber ? String(flatNumber).trim() : null,
            email: email ? String(email).trim() : null,
            mobileNumber: mobileNumber ? String(mobileNumber).trim() : null
        });

        if (!hasApproved) {
            return res.status(403).json({
                error: 'Registration failed: You must have at least one approved contribution to register for events, festivals, or stalls.'
            });
        }

        await db.query(
            'INSERT INTO event_registrations (event_id, name, email, form_data, payment_proof_image, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, formData.name, formData.email || email, formData, paymentProofImage, userId]
        );
        res.status(201).json({ message: 'Registration successful' });
    } catch (err) {
        console.error('Error submitting event registration:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/public/check-contribution', async (req, res) => {
    const { towerNumber, flatNumber, email, mobileNumber } = req.query;
    try {
        const userId = await getUserIdFromReq(req);
        const hasApproved = await checkApprovedContribution({
            userId,
            towerNumber: towerNumber ? String(towerNumber).trim() : null,
            flatNumber: flatNumber ? String(flatNumber).trim() : null,
            email: email ? String(email).trim() : null,
            mobileNumber: mobileNumber ? String(mobileNumber).trim() : null
        });
        res.json({ contributionExists: hasApproved, hasApprovedContribution: hasApproved });
    } catch (err) { 
        res.status(500).json({ error: 'Database query failed' }); 
    }
});

router.get('/public/festivals', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, name, description, start_date AS "startDate", end_date AS "endDate", stall_price_per_table_per_day as "stallPricePerTablePerDay", stall_electricity_cost_per_day as "stallElectricityCostPerDay", stall_start_date as "stallStartDate", stall_end_date as "stallEndDate"
            FROM festivals 
            WHERE deleted_at IS NULL AND stall_start_date IS NOT NULL AND stall_end_date >= CURRENT_DATE
            ORDER BY start_date ASC
        `);
        res.json(rows);
    } catch(err) { res.status(500).json({ error: 'Failed to fetch stall festivals' }); }
});

router.get('/public/festivals/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const festivalRes = await db.query(`
            SELECT id, name, description, start_date AS "startDate", end_date AS "endDate", stall_price_per_table_per_day as "stallPricePerTablePerDay", stall_electricity_cost_per_day as "stallElectricityCostPerDay", stall_start_date as "stallStartDate", stall_end_date as "stallEndDate", max_stalls as "maxStalls"
            FROM festivals 
            WHERE id = $1 AND deleted_at IS NULL AND stall_start_date IS NOT NULL AND stall_end_date >= CURRENT_DATE
        `, [id]);
        if (festivalRes.rows.length === 0) return res.status(404).json({ error: 'Festival not found or registration is closed.' });
        
        const festival = festivalRes.rows[0];

        // Get total counts (pending + approved) for each date
        const totalCountsRes = await db.query(`
            SELECT d::date, COUNT(id)
            FROM stall_registrations, unnest(stall_dates) AS d
            WHERE festival_id = $1 AND status != 'Rejected'
            GROUP BY d
        `, [id]);
        const stallDateCounts = totalCountsRes.rows.reduce((acc, row) => ({...acc, [row.d]: parseInt(row.count, 10)}), {});

        // Get approved counts for each date
        const approvedCountsRes = await db.query(`
            SELECT d::date, COUNT(id)
            FROM stall_registrations, unnest(stall_dates) AS d
            WHERE festival_id = $1 AND status = 'Approved'
            GROUP BY d
        `, [id]);
        const approvedStallCounts = approvedCountsRes.rows.reduce((acc, row) => ({...acc, [row.d]: parseInt(row.count, 10)}), {});

        res.json({...festival, stallDateCounts, approvedStallCounts});
    } catch(err) { 
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch festival details' }); 
    }
});

router.post('/public/festivals/:id/register-stall', async (req, res) => {
    const { id } = req.params;
    const { registrantName, contactNumber, towerNumber, flatNumber, stallDates, products, needsElectricity, numberOfTables, paymentScreenshot } = req.body;

    if (!registrantName || !contactNumber || !stallDates || stallDates.length === 0 || !products || products.length === 0 || !paymentScreenshot) {
        return res.status(400).json({ error: 'Missing required fields for stall registration.' });
    }

    try {
        const userId = await getUserIdFromReq(req);
        const hasApproved = await checkApprovedContribution({
            userId,
            towerNumber: towerNumber ? String(towerNumber).trim() : null,
            flatNumber: flatNumber ? String(flatNumber).trim() : null,
            mobileNumber: contactNumber ? String(contactNumber).trim() : null
        });

        if (!hasApproved) {
            return res.status(403).json({
                error: 'Stall registration failed: You must have at least one approved contribution to register for stalls or festivals.'
            });
        }

        const client = await db.getPool().connect();
        try {
            await client.query('BEGIN');
            await client.query('ALTER TABLE stall_registrations ADD COLUMN IF NOT EXISTS tower_number VARCHAR(50), ADD COLUMN IF NOT EXISTS flat_number VARCHAR(50);');

            const festRes = await client.query('SELECT stall_price_per_table_per_day, stall_electricity_cost_per_day, max_stalls FROM festivals WHERE id=$1', [id]);
            if (festRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Festival not found' });
            }
            const { stall_price_per_table_per_day, stall_electricity_cost_per_day, max_stalls } = festRes.rows[0];
            
            if (max_stalls) {
                const approvedCountsQuery = `
                    SELECT d::date, COUNT(id)
                    FROM stall_registrations, unnest(stall_dates) AS d
                    WHERE festival_id = $1 AND status = 'Approved' AND d = ANY($2::date[])
                    GROUP BY d;
                `;
                const { rows: approvedCounts } = await client.query(approvedCountsQuery, [id, stallDates]);
                for (const count of approvedCounts) {
                    if (count.count >= max_stalls) {
                        await client.query('ROLLBACK');
                        return res.status(409).json({ error: `Sorry, the date ${new Date(count.d).toLocaleDateString()} is now fully booked.`});
                    }
                }
            }
            
            const tableCost = stallDates.length * numberOfTables * (stall_price_per_table_per_day || 0);
            const electricityCost = needsElectricity ? (stallDates.length * numberOfTables * (stall_electricity_cost_per_day || 0)) : 0;
            const totalPayment = tableCost + electricityCost;
            
            await client.query(
                'INSERT INTO stall_registrations (festival_id, registrant_name, contact_number, tower_number, flat_number, stall_dates, products, needs_electricity, number_of_tables, total_payment, payment_screenshot, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                [id, registrantName, contactNumber, towerNumber || null, flatNumber || null, stallDates, JSON.stringify(products), needsElectricity, numberOfTables, totalPayment, paymentScreenshot, userId]
            );
            await client.query('COMMIT');
            res.status(201).json({ message: 'Stall registration submitted successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error submitting stall registration:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});


router.get('/public/albums', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                f.id, 
                f.name, 
                f.description, 
                (SELECT image_data FROM festival_photos WHERE festival_id = f.id ORDER BY created_at DESC LIMIT 1) as "coverImage"
            FROM festivals f
            WHERE f.deleted_at IS NULL AND EXISTS (SELECT 1 FROM festival_photos WHERE festival_id = f.id)
            ORDER BY f.start_date DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch albums' }); }
});

router.get('/public/albums/:id', async (req, res) => {
    try {
        const festivalRes = await db.query('SELECT name, description, start_date as "startDate", end_date as "endDate" FROM festivals WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
        if (festivalRes.rows.length === 0) return res.status(404).json({ error: 'Album not found' });
        
        const photosRes = await db.query('SELECT image_data FROM festival_photos WHERE festival_id=$1 ORDER BY created_at ASC', [req.params.id]);
        
        res.json({
            ...festivalRes.rows[0],
            images: photosRes.rows.map(r => r.image_data)
        });
    } catch (err) { res.status(500).json({ error: 'Failed to fetch album details' }); }
});

router.get('/public/campaigns', async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT id, name, financial_year AS "financialYear", goal, description, is_active AS "isActive" FROM campaigns WHERE deleted_at IS NULL ORDER BY financial_year DESC, name ASC`);
        res.json(rows.map(c => ({ ...c, goal: parseFloat(c.goal), isActive: Boolean(c.isActive) })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

module.exports = router;
