
const express = require('express');
const db = require('../db');
const router = express.Router();

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
    
    if (!formData || !formData.name || !formData.phone_number) {
        return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    try {
        await db.query(
            'INSERT INTO event_registrations (event_id, name, email, form_data, payment_proof_image) VALUES ($1, $2, $3, $4, $5)',
            [id, formData.name, formData.email, formData, paymentProofImage]
        );
        res.status(201).json({ message: 'Registration successful' });
    } catch (err) {
        console.error('Error submitting event registration:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/public/check-contribution', async (req, res) => {
    const { towerNumber, flatNumber } = req.query;
    if (!towerNumber || !flatNumber) return res.status(400).json({ error: 'Tower and flat number are required.' });
    try {
        const { rows } = await db.query('SELECT 1 FROM contributions WHERE tower_number = $1 AND flat_number = $2 AND deleted_at IS NULL LIMIT 1', [towerNumber, flatNumber]);
        res.json({ contributionExists: rows.length > 0 });
    } catch (err) { res.status(500).json({ error: 'Database query failed' }); }
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
    const { registrantName, contactNumber, stallDates, products, needsElectricity, numberOfTables, paymentScreenshot } = req.body;

    if (!registrantName || !contactNumber || !stallDates || stallDates.length === 0 || !products || products.length === 0 || !paymentScreenshot) {
        return res.status(400).json({ error: 'Missing required fields for stall registration.' });
    }
    
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const festRes = await client.query('SELECT stall_price_per_table_per_day, stall_electricity_cost_per_day, max_stalls FROM festivals WHERE id=$1', [id]);
        if (festRes.rows.length === 0) return res.status(404).json({ error: 'Festival not found' });
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
            'INSERT INTO stall_registrations (festival_id, registrant_name, contact_number, stall_dates, products, needs_electricity, number_of_tables, total_payment, payment_screenshot) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, registrantName, contactNumber, stallDates, JSON.stringify(products), needsElectricity, numberOfTables, totalPayment, paymentScreenshot]
        );
        await client.query('COMMIT');
        res.status(201).json({ message: 'Stall registration submitted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error submitting stall registration:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
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

module.exports = router;
