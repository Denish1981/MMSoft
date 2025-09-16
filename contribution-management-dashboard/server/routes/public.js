const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/public/albums', async (req, res) => {
    try {
        const { rows } = await db.query(`
            WITH FestivalImages AS (
                SELECT 
                    festival_id, 
                    image_data,
                    ROW_NUMBER() OVER(PARTITION BY festival_id ORDER BY created_at DESC) as rn
                FROM festival_photos
            )
            SELECT 
                f.id, 
                f.name, 
                f.description, 
                fi.image_data as "coverImage"
            FROM festivals f
            LEFT JOIN FestivalImages fi ON f.id = fi.festival_id AND fi.rn = 1
            WHERE f.deleted_at IS NULL
            ORDER BY f.start_date DESC;
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching public albums:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/public/albums/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const festivalRes = await db.query('SELECT name, description, start_date as "startDate", end_date as "endDate" FROM festivals WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (festivalRes.rows.length === 0) {
            return res.status(404).json({ error: 'Album not found' });
        }
        
        const imagesRes = await db.query(`
            SELECT image_data FROM festival_photos WHERE festival_id = $1 ORDER BY created_at ASC
        `, [id]);

        res.json({
            ...festivalRes.rows[0],
            images: imagesRes.rows.map(r => r.image_data)
        });

    } catch (err) {
        console.error(`Error fetching public album ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/public/check-contribution', async (req, res) => {
    const { towerNumber, flatNumber } = req.query;

    if (!towerNumber || !flatNumber) {
        return res.status(400).json({ error: 'Tower Number and Flat Number are required.' });
    }

    try {
        const contributionCheck = await db.query(
            'SELECT 1 FROM contributions WHERE tower_number ILIKE $1 AND flat_number ILIKE $2 AND deleted_at IS NULL LIMIT 1',
            [String(towerNumber).trim(), String(flatNumber).trim()]
        );
        
        res.json({ contributionExists: contributionCheck.rows.length > 0 });

    } catch (err) {
        console.error('Error checking contribution:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/public/events', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.event_date AS "eventDate",
                to_char(e.start_time, 'HH24:MI') AS "startTime",
                to_char(e.end_time, 'HH24:MI') AS "endTime",
                e.venue,
                e.registration_form_schema as "registrationFormSchema"
            FROM events e
            JOIN festivals f ON e.festival_id = f.id
            WHERE e.deleted_at IS NULL
              AND f.deleted_at IS NULL
              AND e.event_date >= CURRENT_DATE
              AND f.end_date >= CURRENT_DATE
            ORDER BY e.event_date ASC, e.start_time ASC;
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching public events:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/public/events/:id/register', async (req, res) => {
    const { id } = req.params;
    const { formData, paymentProofImage } = req.body;

    if (!formData || typeof formData !== 'object') {
        return res.status(400).json({ error: 'Registration form data is required.' });
    }
    
    try {
        const eventRes = await db.query('SELECT registration_form_schema FROM events WHERE id = $1', [id]);
        if (eventRes.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        
        const schema = eventRes.rows[0].registration_form_schema;
        
        // --- Server-side Validation ---
        for (const field of schema) {
            if (field.required && !formData[field.name]) {
                return res.status(400).json({ error: `Field '${field.label}' is required.` });
            }
        }
        
        // --- Contribution Check ---
        const towerNumber = formData.tower_number;
        const flatNumber = formData.flat_number;

        if (!towerNumber || !flatNumber) {
            return res.status(400).json({ error: 'Tower Number and Flat Number are required for registration.' });
        }

        const contributionCheck = await db.query(
            'SELECT 1 FROM contributions WHERE tower_number ILIKE $1 AND flat_number ILIKE $2 AND deleted_at IS NULL LIMIT 1',
            [String(towerNumber).trim(), String(flatNumber).trim()]
        );
        
        if (contributionCheck.rows.length === 0) {
            if (!paymentProofImage) {
                return res.status(403).json({ error: 'Registration is for contributing members. If you have already contributed, please upload proof of payment to proceed.' });
            }
        }
        
        const name = formData.name || 'Unnamed';
        const email = formData.email || null;
        
        // Remove name and email from formData if they exist to avoid duplication
        const customData = { ...formData };
        delete customData.name;
        delete customData.email;

        await db.query(
            'INSERT INTO event_registrations (event_id, name, email, form_data, payment_proof_image) VALUES ($1, $2, $3, $4, $5)',
            [id, name, email, JSON.stringify(customData), paymentProofImage || null]
        );
        res.status(201).json({ message: 'Registration successful.' });
    } catch (err) {
        console.error(`Error saving registration for event ${id}:`, err);
        res.status(500).json({ error: 'Could not process your registration at this time.' });
    }
});


module.exports = router;