const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:participants:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                DISTINCT ON (LOWER(name), form_data->>'phone_number')
                name,
                email,
                form_data->>'phone_number' as "phoneNumber",
                (
                    SELECT COUNT(DISTINCT event_id) 
                    FROM event_registrations r2 
                    WHERE LOWER(r2.name) = LOWER(r1.name) 
                    AND r2.form_data->>'phone_number' = r1.form_data->>'phone_number'
                ) as "registrationCount",
                submitted_at as "lastRegisteredAt"
            FROM event_registrations r1
            WHERE form_data->>'phone_number' IS NOT NULL
            ORDER BY LOWER(name), form_data->>'phone_number', submitted_at DESC;
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching unique participants:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:name/:phone', authMiddleware, permissionMiddleware('page:participants:view'), async (req, res) => {
    const { name, phone } = req.params;
    const phoneNumber = phone === 'none' ? null : phone;
    
    try {
        const query = phoneNumber
            ? `SELECT r.name, r.email, r.form_data->>'phone_number' as "phoneNumber", e.name as "eventName", e.event_date as "eventDate", r.submitted_at as "submittedAt"
               FROM event_registrations r
               JOIN events e ON r.event_id = e.id
               WHERE LOWER(r.name) = LOWER($1) AND r.form_data->>'phone_number' = $2
               ORDER BY e.event_date DESC`
            : `SELECT r.name, r.email, r.form_data->>'phone_number' as "phoneNumber", e.name as "eventName", e.event_date as "eventDate", r.submitted_at as "submittedAt"
               FROM event_registrations r
               JOIN events e ON r.event_id = e.id
               WHERE LOWER(r.name) = LOWER($1) AND r.form_data->>'phone_number' IS NULL
               ORDER BY e.event_date DESC`;

        const params = phoneNumber ? [name, phoneNumber] : [name];
        
        const { rows } = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        const response = {
            participant: {
                name: rows[0].name,
                email: rows[0].email,
                phoneNumber: rows[0].phoneNumber
            },
            registrations: rows.map(({ eventName, eventDate, submittedAt }) => ({
                eventName,
                eventDate,
                submittedAt
            }))
        };
        
        res.json(response);

    } catch (err) {
        console.error('Error fetching participant details:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;