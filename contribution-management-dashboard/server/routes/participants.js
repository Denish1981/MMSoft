const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:participants:view'), async (req, res) => {
    const { festivalId } = req.query;
    try {
        const params = festivalId ? [festivalId] : [];
        const festivalFilter = festivalId ? `AND e1.festival_id = $1` : '';
        const countFestivalFilter = festivalId ? `AND e2.festival_id = $1` : '';

        const query = `
            SELECT
                DISTINCT ON (LOWER(r1.name), COALESCE(r1.form_data->>'phone_number', ''))
                r1.name,
                r1.email,
                r1.form_data->>'phone_number' as "phoneNumber",
                COALESCE(
                    r1.form_data->>'tower_number',
                    r1.form_data->>'towerNumber',
                    r1.form_data->>'tower',
                    (
                        SELECT c.tower_number 
                        FROM contributions c 
                        WHERE c.deleted_at IS NULL 
                          AND c.tower_number IS NOT NULL 
                          AND (
                            (
                              r1.form_data->>'phone_number' IS NOT NULL 
                              AND (
                                c.mobile_number = r1.form_data->>'phone_number' 
                                OR REPLACE(COALESCE(c.mobile_number, ''), ' ', '') = REPLACE(COALESCE(r1.form_data->>'phone_number', ''), ' ', '')
                              )
                            )
                            OR (
                              r1.email IS NOT NULL 
                              AND r1.email != '' 
                              AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM(r1.email))
                            )
                          )
                        ORDER BY c.date DESC, c.id DESC
                        LIMIT 1
                    )
                ) as "towerNumber",
                COALESCE(
                    r1.form_data->>'flat_number',
                    r1.form_data->>'flatNumber',
                    r1.form_data->>'flat',
                    (
                        SELECT c.flat_number 
                        FROM contributions c 
                        WHERE c.deleted_at IS NULL 
                          AND c.flat_number IS NOT NULL 
                          AND (
                            (
                              r1.form_data->>'phone_number' IS NOT NULL 
                              AND (
                                c.mobile_number = r1.form_data->>'phone_number' 
                                OR REPLACE(COALESCE(c.mobile_number, ''), ' ', '') = REPLACE(COALESCE(r1.form_data->>'phone_number', ''), ' ', '')
                              )
                            )
                            OR (
                              r1.email IS NOT NULL 
                              AND r1.email != '' 
                              AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM(r1.email))
                            )
                          )
                        ORDER BY c.date DESC, c.id DESC
                        LIMIT 1
                    )
                ) as "flatNumber",
                CAST((
                    SELECT COUNT(DISTINCT r2.event_id)
                    FROM event_registrations r2
                    JOIN events e2 ON r2.event_id = e2.id
                    WHERE LOWER(r2.name) = LOWER(r1.name)
                    AND COALESCE(r2.form_data->>'phone_number', '') = COALESCE(r1.form_data->>'phone_number', '')
                    ${countFestivalFilter}
                ) AS INTEGER) as "registrationCount",
                (
                    SELECT COALESCE(json_agg(DISTINCT e2.name ORDER BY e2.name), '[]'::json)
                    FROM event_registrations r2
                    JOIN events e2 ON r2.event_id = e2.id
                    WHERE LOWER(r2.name) = LOWER(r1.name)
                    AND COALESCE(r2.form_data->>'phone_number', '') = COALESCE(r1.form_data->>'phone_number', '')
                    ${countFestivalFilter}
                ) as "events",
                r1.submitted_at as "lastRegisteredAt"
            FROM event_registrations r1
            JOIN events e1 ON r1.event_id = e1.id
            WHERE 1=1
            ${festivalFilter}
            ORDER BY LOWER(r1.name), COALESCE(r1.form_data->>'phone_number', ''), r1.submitted_at DESC;
        `;
        
        const { rows } = await db.query(query, params);
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
            ? `SELECT 
                r.name, 
                r.email, 
                r.form_data->>'phone_number' as "phoneNumber",
                COALESCE(
                    r.form_data->>'tower_number',
                    r.form_data->>'towerNumber',
                    r.form_data->>'tower',
                    (
                        SELECT c.tower_number 
                        FROM contributions c 
                        WHERE c.deleted_at IS NULL 
                          AND c.tower_number IS NOT NULL 
                          AND (
                            (
                              r.form_data->>'phone_number' IS NOT NULL 
                              AND (
                                c.mobile_number = r.form_data->>'phone_number' 
                                OR REPLACE(COALESCE(c.mobile_number, ''), ' ', '') = REPLACE(COALESCE(r.form_data->>'phone_number', ''), ' ', '')
                              )
                            )
                            OR (
                              r.email IS NOT NULL 
                              AND r.email != '' 
                              AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM(r.email))
                            )
                          )
                        ORDER BY c.date DESC, c.id DESC
                        LIMIT 1
                    )
                ) as "towerNumber",
                COALESCE(
                    r.form_data->>'flat_number',
                    r.form_data->>'flatNumber',
                    r.form_data->>'flat',
                    (
                        SELECT c.flat_number 
                        FROM contributions c 
                        WHERE c.deleted_at IS NULL 
                          AND c.flat_number IS NOT NULL 
                          AND (
                            (
                              r.form_data->>'phone_number' IS NOT NULL 
                              AND (
                                c.mobile_number = r.form_data->>'phone_number' 
                                OR REPLACE(COALESCE(c.mobile_number, ''), ' ', '') = REPLACE(COALESCE(r.form_data->>'phone_number', ''), ' ', '')
                              )
                            )
                            OR (
                              r.email IS NOT NULL 
                              AND r.email != '' 
                              AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM(r.email))
                            )
                          )
                        ORDER BY c.date DESC, c.id DESC
                        LIMIT 1
                    )
                ) as "flatNumber",
                e.name as "eventName", 
                e.event_date as "eventDate", 
                r.submitted_at as "submittedAt"
               FROM event_registrations r
               JOIN events e ON r.event_id = e.id
               WHERE LOWER(r.name) = LOWER($1) AND r.form_data->>'phone_number' = $2
               ORDER BY e.event_date DESC`
            : `SELECT 
                r.name, 
                r.email, 
                r.form_data->>'phone_number' as "phoneNumber",
                COALESCE(
                    r.form_data->>'tower_number',
                    r.form_data->>'towerNumber',
                    r.form_data->>'tower',
                    (
                        SELECT c.tower_number 
                        FROM contributions c 
                        WHERE c.deleted_at IS NULL 
                          AND c.tower_number IS NOT NULL 
                          AND (
                            (
                              r.form_data->>'phone_number' IS NOT NULL 
                              AND (
                                c.mobile_number = r.form_data->>'phone_number' 
                                OR REPLACE(COALESCE(c.mobile_number, ''), ' ', '') = REPLACE(COALESCE(r.form_data->>'phone_number', ''), ' ', '')
                              )
                            )
                            OR (
                              r.email IS NOT NULL 
                              AND r.email != '' 
                              AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM(r.email))
                            )
                          )
                        ORDER BY c.date DESC, c.id DESC
                        LIMIT 1
                    )
                ) as "towerNumber",
                COALESCE(
                    r.form_data->>'flat_number',
                    r.form_data->>'flatNumber',
                    r.form_data->>'flat',
                    (
                        SELECT c.flat_number 
                        FROM contributions c 
                        WHERE c.deleted_at IS NULL 
                          AND c.flat_number IS NOT NULL 
                          AND (
                            (
                              r.form_data->>'phone_number' IS NOT NULL 
                              AND (
                                c.mobile_number = r.form_data->>'phone_number' 
                                OR REPLACE(COALESCE(c.mobile_number, ''), ' ', '') = REPLACE(COALESCE(r.form_data->>'phone_number', ''), ' ', '')
                              )
                            )
                            OR (
                              r.email IS NOT NULL 
                              AND r.email != '' 
                              AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM(r.email))
                            )
                          )
                        ORDER BY c.date DESC, c.id DESC
                        LIMIT 1
                    )
                ) as "flatNumber",
                e.name as "eventName", 
                e.event_date as "eventDate", 
                r.submitted_at as "submittedAt"
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
                phoneNumber: rows[0].phoneNumber,
                towerNumber: rows[0].towerNumber,
                flatNumber: rows[0].flatNumber
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