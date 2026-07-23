const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');

const router = express.Router();

// Get all stall registrations
router.get('/', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        await db.query('ALTER TABLE stall_registrations ADD COLUMN IF NOT EXISTS tower_number VARCHAR(50), ADD COLUMN IF NOT EXISTS flat_number VARCHAR(50);');
        const { rows } = await db.query(`
            SELECT 
                sr.id, sr.festival_id as "festivalId", sr.registrant_name as "registrantName", sr.contact_number as "contactNumber",
                sr.tower_number as "towerNumber", sr.flat_number as "flatNumber",
                sr.stall_dates::TEXT[] as "stallDates", sr.products,
                sr.needs_electricity as "needsElectricity", sr.number_of_tables as "numberOfTables",
                sr.total_payment as "totalPayment", sr.payment_screenshot as "paymentScreenshot", sr.submitted_at as "submittedAt",
                sr.status, sr.rejection_reason as "rejectionReason", sr.reviewed_at as "reviewedAt", u.username as "reviewedBy"
            FROM stall_registrations sr
            LEFT JOIN users u ON sr.reviewed_by_user_id = u.id
            ORDER BY sr.submitted_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching all stall registrations:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a stall registration's status
router.put('/:id/status', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const userId = req.user.id;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
    }
    
    if (status === 'Rejected' && !rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a registration.' });
    }

    try {
        await db.query(
            `UPDATE stall_registrations 
             SET status = $1, rejection_reason = $2, reviewed_by_user_id = $3, reviewed_at = NOW() 
             WHERE id = $4`,
            [status, status === 'Rejected' ? rejectionReason : null, userId, id]
        );
        
        // Fetch details of this stall registration and its associated campaign (via festivals)
        const regRes = await db.query(`
            SELECT sr.*, f.campaign_id
            FROM stall_registrations sr
            JOIN festivals f ON sr.festival_id = f.id
            WHERE sr.id = $1
        `, [id]);

        if (regRes.rows.length > 0) {
            const registration = regRes.rows[0];
            
            // Delete any existing contribution for this stall registration to avoid duplicates
            await db.query('DELETE FROM contributions WHERE stall_registration_id = $1', [id]);

            if (status === 'Approved') {
                // Insert a matching Contribution row!
                await db.query(`
                    INSERT INTO contributions (
                        donor_name, donor_email, mobile_number, tower_number, flat_number, 
                        amount, number_of_coupons, campaign_id, date, status, type, stall_registration_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    registration.registrant_name,
                    null,
                    registration.contact_number,
                    registration.tower_number || 'Stall',
                    registration.flat_number || 'N/A',
                    registration.total_payment,
                    0,
                    registration.campaign_id,
                    registration.submitted_at || new Date(),
                    'Completed',
                    'Stall Fee',
                    id
                ]);
            }
        }
        
        const updatedRegRes = await db.query(`
            SELECT 
                sr.id, sr.festival_id as "festivalId", sr.registrant_name as "registrantName", sr.contact_number as "contactNumber",
                sr.stall_dates as "stallDates", sr.products,
                sr.needs_electricity as "needsElectricity", sr.number_of_tables as "numberOfTables",
                sr.total_payment as "totalPayment", sr.payment_screenshot as "paymentScreenshot", sr.submitted_at as "submittedAt",
                sr.status, sr.rejection_reason as "rejectionReason", sr.reviewed_at as "reviewedAt", u.username as "reviewedBy"
            FROM stall_registrations sr
            LEFT JOIN users u ON sr.reviewed_by_user_id = u.id
            WHERE sr.id = $1
        `, [id]);

        if (updatedRegRes.rows.length === 0) {
            return res.status(404).json({ error: 'Stall registration not found after update.' });
        }
        
        res.json(updatedRegRes.rows[0]);

    } catch (err) {
        console.error('Error updating stall registration status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// DELETE a single stall registration
router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM stall_registrations WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Stall registration not found.' });
        }
        res.status(204).send(); // No Content
    } catch (err) {
        console.error(`Error deleting stall registration ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
