const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');

const router = express.Router();

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
        const { rows } = await db.query(
            `UPDATE stall_registrations 
             SET status = $1, rejection_reason = $2, reviewed_by_user_id = $3, reviewed_at = NOW() 
             WHERE id = $4`,
            [status, status === 'Rejected' ? rejectionReason : null, userId, id]
        );
        
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
