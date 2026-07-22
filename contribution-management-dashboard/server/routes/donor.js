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
        const tower = user.towerNumber || '';
        const flat = user.flatNumber || '';
        const mobile = user.mobileNumber || '';

        // Fetch My Contributions
        const contribRes = await db.query(
            `SELECT c.id, c.donor_name AS "donorName", c.amount, c.number_of_coupons AS "numberOfCoupons", 
                    c.date, c.status, c.type, c.tower_number AS "towerNumber", c.flat_number AS "flatNumber", 
                    c.image, cmp.name AS "campaignName" 
             FROM contributions c 
             LEFT JOIN campaigns cmp ON c.campaign_id = cmp.id 
             WHERE (c.user_id = $1 OR (c.tower_number = $2 AND c.flat_number = $3 AND $2 != '')) AND c.deleted_at IS NULL 
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
                    er.form_data AS "formData" 
             FROM event_registrations er 
             LEFT JOIN events e ON er.event_id = e.id 
             WHERE er.user_id = $1 OR er.email = $2
             ORDER BY er.submitted_at DESC`,
            [userId, user.username]
        );

        // Fetch Upcoming Events
        const upcomingEventsRes = await db.query(
            `SELECT id, name, description, event_date AS "eventDate", start_time AS "startTime", venue 
             FROM events 
             WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE 
             ORDER BY event_date ASC LIMIT 5`
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

module.exports = router;
