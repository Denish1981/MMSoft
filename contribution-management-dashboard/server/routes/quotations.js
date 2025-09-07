const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:quotations:view'), async (req, res) => {
    try {
        const quotationsResult = await db.query('SELECT id, quotation_for AS "quotationFor", vendor_id AS "vendorId", cost, date, festival_id as "festivalId", created_at AS "createdAt", updated_at AS "updatedAt" FROM quotations WHERE deleted_at IS NULL ORDER BY date DESC');
        const quotations = quotationsResult.rows;
        for (const quote of quotations) {
            const imagesResult = await db.query('SELECT image_data FROM quotation_images WHERE quotation_id = $1', [quote.id]);
            quote.quotationImages = imagesResult.rows.map(row => row.image_data);
        }
        res.json(quotations);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { quotationFor, vendorId, cost, date, quotationImages, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const quoteRes = await client.query('INSERT INTO quotations (quotation_for, vendor_id, cost, date, festival_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [quotationFor, vendorId, cost, date, festivalId || null]);
        const newQuotation = quoteRes.rows[0];

        const insertedImages = [];
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [newQuotation.id, image]);
            insertedImages.push(image);
        }
        await client.query('COMMIT');
        res.status(201).json({
            id: newQuotation.id,
            quotationFor: newQuotation.quotation_for,
            vendorId: newQuotation.vendor_id,
            cost: newQuotation.cost,
            date: newQuotation.date,
            festivalId: newQuotation.festival_id,
            quotationImages: insertedImages,
            createdAt: newQuotation.created_at,
            updatedAt: newQuotation.updated_at
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { quotationFor, vendorId, cost, date, quotationImages, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM quotations WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Quotation not found');

        const result = await client.query('UPDATE quotations SET quotation_for=$1, vendor_id=$2, cost=$3, date=$4, festival_id=$5, updated_at=NOW() WHERE id=$6 RETURNING *', [quotationFor, vendorId, cost, date, festivalId || null, id]);
        
        await logChanges(client, {
            historyTable: 'quotations_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { quotationFor: 'quotation_for', vendorId: 'vendor_id', cost: 'cost', date: 'date', festivalId: 'festival_id' }
        });

        await client.query('DELETE FROM quotation_images WHERE quotation_id=$1', [id]);
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [id, image]);
        }
        await client.query('COMMIT');
        const updatedQuotation = result.rows[0];
        res.json({
            id: updatedQuotation.id, quotationFor: updatedQuotation.quotation_for, vendorId: updatedQuotation.vendor_id, cost: updatedQuotation.cost,
            date: updatedQuotation.date, quotationImages, festivalId: updatedQuotation.festival_id,
            createdAt: updatedQuotation.created_at, updatedAt: updatedQuotation.updated_at
        });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to update quotation' }); }
    finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('quotations'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('quotations'));

module.exports = router;
