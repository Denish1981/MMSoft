const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:sponsors:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, contact_number AS "contactNumber", address, email, business_category AS "businessCategory", business_info AS "businessInfo", sponsorship_amount AS "sponsorshipAmount", sponsorship_type AS "sponsorshipType", date_paid as "datePaid", payment_received_by as "paymentReceivedBy", image, created_at AS "createdAt", updated_at AS "updatedAt" FROM sponsors WHERE deleted_at IS NULL ORDER BY name ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid, paymentReceivedBy, image } = req.body;
    try {
        const result = await db.query('INSERT INTO sponsors (name, contact_number, address, email, business_category, business_info, sponsorship_amount, sponsorship_type, date_paid, payment_received_by, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid, paymentReceivedBy, image]);
        const newSponsor = result.rows[0];
        res.status(201).json({
            id: newSponsor.id,
            name: newSponsor.name,
            contactNumber: newSponsor.contact_number,
            address: newSponsor.address,
            email: newSponsor.email,
            businessCategory: newSponsor.business_category,
            businessInfo: newSponsor.business_info,
            sponsorshipAmount: newSponsor.sponsorship_amount,
            sponsorshipType: newSponsor.sponsorship_type,
            datePaid: newSponsor.date_paid,
            paymentReceivedBy: newSponsor.payment_received_by,
            image: newSponsor.image,
            createdAt: newSponsor.created_at,
            updatedAt: newSponsor.updated_at
        });
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid, paymentReceivedBy, image } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM sponsors WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Sponsor not found');

        const result = await client.query('UPDATE sponsors SET name=$1, contact_number=$2, address=$3, email=$4, business_category=$5, business_info=$6, sponsorship_amount=$7, sponsorship_type=$8, date_paid=$9, payment_received_by=$10, image=$11, updated_at=NOW() WHERE id=$12 RETURNING *',
            [name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid, paymentReceivedBy, image, id]);
        
        await logChanges(client, {
            historyTable: 'sponsors_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { name: 'name', contactNumber: 'contact_number', address: 'address', email: 'email', businessCategory: 'business_category', businessInfo: 'business_info', sponsorshipAmount: 'sponsorship_amount', sponsorshipType: 'sponsorship_type', datePaid: 'date_paid', paymentReceivedBy: 'payment_received_by', image: 'image' }
        });

        await client.query('COMMIT');
        const updatedSponsor = result.rows[0];
        res.json({
            id: updatedSponsor.id, name: updatedSponsor.name, contactNumber: updatedSponsor.contact_number, address: updatedSponsor.address, email: updatedSponsor.email,
            businessCategory: updatedSponsor.business_category, businessInfo: updatedSponsor.business_info, sponsorshipAmount: updatedSponsor.sponsorship_amount,
            sponsorshipType: updatedSponsor.sponsorship_type, datePaid: updatedSponsor.date_paid, paymentReceivedBy: updatedSponsor.payment_received_by, image: updatedSponsor.image, createdAt: updatedSponsor.created_at, updatedAt: updatedSponsor.updated_at
        });
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update sponsor' }); 
    } finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('sponsors'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('sponsors'));

module.exports = router;