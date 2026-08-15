const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth/middleware');

const router = express.Router();

router.get('/my-portal', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        // Fetch User Info
        const userRes = await db.query(
            'SELECT id, username, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber" FROM users WHERE id = $1',
            [userId]
        );
        const user = userRes.rows[0] || {};
        const userEmail = user.username || '';
        const tower = user.towerNumber || '';
        const flat = user.flatNumber || '';
        const mobile = user.mobileNumber || '';

        // Fetch My Contributions
        const contribRes = await db.query(
            `SELECT c.id, c.donor_name AS "donorName", c.amount, c.number_of_coupons AS "numberOfCoupons", 
                    c.date, c.status, c.type, c.tower_number AS "towerNumber", c.flat_number AS "flatNumber", 
                    c.festival_id AS "festivalId", f.name AS "festivalName", cmp.name AS "campaignName",
                    CASE WHEN c.image IS NOT NULL AND c.image != '' THEN CASE WHEN c.image LIKE '/api/%' OR c.image LIKE 'http://%' OR c.image LIKE 'https://%' THEN c.image ELSE CONCAT('/api/contributions/', c.id, '/image') END ELSE NULL END AS image 
             FROM contributions c 
             LEFT JOIN festivals f ON c.festival_id = f.id
             LEFT JOIN campaigns cmp ON c.campaign_id = cmp.id 
             WHERE (
                 c.user_id = $1 
                 OR (
                     $2 != '' AND $3 != '' AND (
                         (LOWER(TRIM(c.tower_number)) = LOWER(TRIM($2)) AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                         OR (REPLACE(LOWER(TRIM(c.tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($2)), 'tower', '') AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                         OR (REGEXP_REPLACE(LOWER(c.tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($2), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(c.flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($3), '[^0-9a-z]', '', 'g'))
                     )
                 )
                 OR (
                     $2 != '' AND $3 != '' AND c.user_id IN (
                         SELECT id FROM users 
                         WHERE (LOWER(TRIM(tower_number)) = LOWER(TRIM($2)) AND LOWER(TRIM(flat_number)) = LOWER(TRIM($3)))
                            OR (REPLACE(LOWER(TRIM(tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($2)), 'tower', '') AND LOWER(TRIM(flat_number)) = LOWER(TRIM($3)))
                            OR (REGEXP_REPLACE(LOWER(tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($2), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($3), '[^0-9a-z]', '', 'g'))
                     )
                 )
             ) AND c.deleted_at IS NULL 
             ORDER BY c.date DESC`,
            [userId, tower, flat]
        );

        // Fetch My Stall Registrations
        const stallRes = await db.query(
            `SELECT sr.id, sr.festival_id AS "festivalId", f.name AS "festivalName", 
                    sr.registrant_name AS "registrantName", sr.contact_number AS "contactNumber", 
                    sr.stall_dates::TEXT[] AS "stallDates", sr.products, sr.needs_electricity AS "needsElectricity", 
                    sr.number_of_tables AS "numberOfTables", sr.total_payment AS "totalPayment", 
                    sr.status, sr.rejection_reason AS "rejectionReason", sr.submitted_at AS "submittedAt", 
                    sr.reviewed_at AS "reviewedAt" 
             FROM stall_registrations sr 
             LEFT JOIN festivals f ON sr.festival_id = f.id 
             WHERE (sr.user_id = $1 OR (sr.contact_number = $2 AND $2 != '')) 
             ORDER BY sr.submitted_at DESC`,
            [userId, mobile]
        );

        // Fetch My Event Registrations
        const eventRegRes = await db.query(
            `SELECT er.id, er.event_id AS "eventId", e.name AS "eventName", 
                    e.event_date AS "eventDate", e.venue, er.submitted_at AS "submittedAt", 
                    er.form_data AS "formData", er.name, er.email,
                    er.payment_proof_image AS "paymentProofImage"
             FROM event_registrations er 
             LEFT JOIN events e ON er.event_id = e.id 
             WHERE er.user_id = $1 
                OR ($2 != '' AND (er.email = $2 OR er.form_data->>'email' = $2))
                OR ($3 != '' AND (
                    er.form_data->>'phone_number' = $3 OR 
                    er.form_data->>'contact_number' = $3 OR 
                    er.form_data->>'mobile_number' = $3 OR
                    er.form_data->>'phone' = $3
                ))
                OR ($4 != '' AND $5 != '' AND (
                    (LOWER(TRIM(er.form_data->>'tower_number')) = LOWER(TRIM($4)) AND LOWER(TRIM(er.form_data->>'flat_number')) = LOWER(TRIM($5)))
                    OR (LOWER(TRIM(er.form_data->>'towerNumber')) = LOWER(TRIM($4)) AND LOWER(TRIM(er.form_data->>'flatNumber')) = LOWER(TRIM($5)))
                ))
             ORDER BY er.submitted_at DESC`,
            [userId, userEmail, mobile, tower, flat]
        );

        // Fetch Upcoming Events
        const upcomingEventsRes = await db.query(
            `SELECT 
                e.id, 
                e.name, 
                e.description, 
                e.event_date AS "eventDate", 
                e.start_time AS "startTime", 
                e.venue,
                e.registration_deadline AS "registrationDeadline",
                e.registration_form_schema AS "registrationFormSchema",
                COALESCE(
                    (
                        SELECT json_agg(json_build_object(
                            'name', c.name,
                            'contactNumber', c.contact_number,
                            'email', c.email
                        ))
                        FROM event_contact_persons c
                        WHERE c.event_id = e.id
                    ), '[]'::json
                ) as "contactPersons"
             FROM events e 
             WHERE e.deleted_at IS NULL AND e.event_date >= CURRENT_DATE 
             ORDER BY e.event_date ASC`
        );

        res.json({
            user,
            contributions: contribRes.rows,
            stallRegistrations: stallRes.rows,
            eventRegistrations: eventRegRes.rows,
            upcomingEvents: upcomingEventsRes.rows
        });
    } catch (err) {
        console.error('Error fetching donor portal data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const checkUserApprovedContribution = async (userId) => {
    try {
        const userRes = await db.query('SELECT tower_number, flat_number, username, mobile_number FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return false;
        const u = userRes.rows[0];
        const tower = u.tower_number ? String(u.tower_number).trim() : '';
        const flat = u.flat_number ? String(u.flat_number).trim() : '';
        const email = u.username ? String(u.username).trim() : '';
        const mobile = u.mobile_number ? String(u.mobile_number).trim() : '';

        const query = `
            SELECT 1 FROM contributions c
            WHERE c.deleted_at IS NULL 
              AND c.status IN ('Approved', 'Completed') 
              AND (
                c.user_id = $1
                OR ($2 != '' AND $3 != '' AND (
                    (LOWER(TRIM(c.tower_number)) = LOWER(TRIM($2)) AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                    OR (REPLACE(LOWER(TRIM(c.tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($2)), 'tower', '') AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                    OR (REGEXP_REPLACE(LOWER(c.tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($2), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(c.flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($3), '[^0-9a-z]', '', 'g'))
                ))
                OR ($4 != '' AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM($4)))
                OR ($5 != '' AND (c.mobile_number = $5 OR REPLACE(c.mobile_number, ' ', '') = REPLACE($5, ' ', '')))
              )
            LIMIT 1
        `;
        const { rows } = await db.query(query, [userId, tower, flat, email, mobile]);
        return rows.length > 0;
    } catch (err) {
        console.error('Error in checkUserApprovedContribution:', err);
        return false;
    }
};

router.post('/member-events', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { memberName, memberPhone, memberEmail, selectedEventIds = [] } = req.body;

    if (!memberName || !memberName.trim()) {
        return res.status(400).json({ error: 'Member name is required.' });
    }

    const cleanMemberName = memberName.trim();

    try {
        const hasApproved = await checkUserApprovedContribution(userId);
        if (!hasApproved) {
            return res.status(403).json({
                error: 'Registration failed: You must have at least one approved contribution to register household members for events.'
            });
        }

        const userRes = await db.query(
            'SELECT username, mobile_number, tower_number, flat_number FROM users WHERE id = $1',
            [userId]
        );
        const userObj = userRes.rows[0] || {};
        const tower = userObj.tower_number || '';
        const flat = userObj.flat_number || '';
        const defaultEmail = userObj.username || '';
        const defaultMobile = userObj.mobile_number || '';

        // Fetch existing registrations for this user or matching member name
        const existingRegsRes = await db.query(
            `SELECT er.id, er.event_id AS "eventId", er.name, er.email, er.form_data AS "formData"
             FROM event_registrations er
             WHERE er.user_id = $1 
                OR (LOWER(TRIM(er.name)) = LOWER(TRIM($2)))
                OR (LOWER(TRIM(er.form_data->>'name')) = LOWER(TRIM($2)))`,
            [userId, cleanMemberName]
        );

        const memberRegs = existingRegsRes.rows.filter(r => {
            const rName = (r.name || r.formData?.name || r.formData?.fullName || '').trim().toLowerCase();
            return rName === cleanMemberName.toLowerCase();
        });

        const currentRegisteredEventIds = memberRegs.map(r => Number(r.eventId));
        const targetEventIds = (selectedEventIds || []).map(id => Number(id));

        const client = await db.getPool().connect();
        try {
            await client.query('BEGIN');

            // 1. Delete registrations for events that were unchecked in modal
            const idsToDelete = memberRegs
                .filter(r => !targetEventIds.includes(Number(r.eventId)))
                .map(r => r.id);

            if (idsToDelete.length > 0) {
                await client.query(
                    'DELETE FROM event_registrations WHERE id = ANY($1::int[])',
                    [idsToDelete]
                );
            }

            // 2. Add registrations for newly checked events
            const eventsToAdd = targetEventIds.filter(evtId => !currentRegisteredEventIds.includes(evtId));

            if (eventsToAdd.length > 0) {
                const now = new Date();
                const eventsCheck = await client.query(
                    'SELECT id, name, event_date, registration_deadline FROM events WHERE id = ANY($1::int[]) AND deleted_at IS NULL',
                    [eventsToAdd]
                );
                for (const evt of eventsCheck.rows) {
                    let isClosed = false;
                    if (evt.registration_deadline) {
                        const trimmed = String(evt.registration_deadline).trim();
                        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                            const [y, m, d] = trimmed.split('-').map(Number);
                            const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
                            if (now.getTime() > endOfDay.getTime()) isClosed = true;
                        } else {
                            const deadline = new Date(trimmed);
                            if (!isNaN(deadline.getTime()) && now.getTime() > deadline.getTime()) isClosed = true;
                        }
                    } else if (evt.event_date) {
                        const trimmed = String(evt.event_date).trim();
                        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                            const [y, m, d] = trimmed.split('-').map(Number);
                            const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
                            if (now.getTime() > endOfDay.getTime()) isClosed = true;
                        } else {
                            const eDate = new Date(trimmed);
                            if (!isNaN(eDate.getTime()) && now.getTime() > eDate.getTime()) isClosed = true;
                        }
                    }

                    if (isClosed) {
                        const cutoffDate = evt.registration_deadline || evt.event_date;
                        const formattedCutoff = new Date(cutoffDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        throw new Error(`Registration for "${evt.name}" closed on ${formattedCutoff}.`);
                    }
                }
            }

            for (const evtId of eventsToAdd) {
                const pEmail = (memberEmail || defaultEmail).trim();
                const pPhone = (memberPhone || defaultMobile).trim();
                const formData = {
                    name: cleanMemberName,
                    phone_number: pPhone,
                    contact_number: pPhone,
                    mobile_number: pPhone,
                    email: pEmail,
                    tower_number: tower,
                    flat_number: flat,
                    is_household_member: true
                };

                await client.query(
                    'INSERT INTO event_registrations (event_id, name, email, form_data, user_id) VALUES ($1, $2, $3, $4, $5)',
                    [evtId, cleanMemberName, pEmail, formData, userId]
                );
            }

            await client.query('COMMIT');
            res.json({
                message: `Events updated successfully for ${cleanMemberName}.`,
                registeredEventIds: targetEventIds
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error in /api/donor/member-events:', err);
        res.status(500).json({ error: err.message || 'Failed to update member event registrations' });
    }
});

module.exports = router;
