const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:vendors:view'), async (req, res) => {
    try {
        const vendorsResult = await db.query('SELECT id, name, business, address, created_at AS "createdAt", updated_at AS "updatedAt" FROM vendors WHERE deleted_at IS NULL ORDER BY name ASC');
        const vendors = vendorsResult.rows;
        for (const vendor of vendors) {
            const contactsResult = await db.query('SELECT name, contact_number as "contactNumber" FROM contact_persons WHERE vendor_id = $1', [vendor.id]);
            vendor.contacts = contactsResult.rows;
        }
        res.json(vendors);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, business, address, contacts } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const vendorRes = await client.query('INSERT INTO vendors (name, business, address) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at', [name, business, address]);
        const newVendor = vendorRes.rows[0];
        
        const insertedContacts = [];
        for (const contact of contacts) {
            const contactRes = await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3) RETURNING name, contact_number', [newVendor.id, contact.name, contact.contactNumber]);
            insertedContacts.push({name: contactRes.rows[0].name, contactNumber: contactRes.rows[0].contact_number});
        }
        await client.query('COMMIT');
        res.status(201).json({ id: newVendor.id, name, business, address, contacts: insertedContacts, createdAt: newVendor.created_at, updatedAt: newVendor.updated_at });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, business, address, contacts } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM vendors WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Vendor not found');
        
        const result = await client.query('UPDATE vendors SET name=$1, business=$2, address=$3, updated_at=NOW() WHERE id=$4 RETURNING created_at, updated_at', [name, business, address, id]);
        
        await logChanges(client, {
            historyTable: 'vendors_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: { name, business, address },
            fieldMapping: { name: 'name', business: 'business', address: 'address' }
        });
        
        const oldContactsRes = await client.query('SELECT name, contact_number FROM contact_persons WHERE vendor_id=$1', [id]);
        const oldContactsStr = oldContactsRes.rows.map(c => `${c.name}:${c.contact_number}`).sort().join(';');
        const newContactsStr = contacts.map(c => `${c.name}:${c.contactNumber}`).sort().join(';');
        
        if (oldContactsStr !== newContactsStr) {
            await logChanges(client, {
                historyTable: 'vendors_history', recordId: id, changedByUserId: req.user.id,
                oldData: { 'contacts': oldContactsStr }, newData: { 'contacts': newContactsStr },
                fieldMapping: { contacts: 'contacts' }
            });
            await client.query('DELETE FROM contact_persons WHERE vendor_id=$1', [id]);
            for (const contact of contacts) {
                await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3)', [id, contact.name, contact.contactNumber]);
            }
        }

        await client.query('COMMIT');
        res.json({ id, name, business, address, contacts, createdAt: result.rows[0].created_at, updatedAt: result.rows[0].updated_at });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to update vendor' }); }
    finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    const { id } = req.params;
    try {
        const expenseCheck = await db.query('SELECT id FROM expenses WHERE vendor_id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
        if (expenseCheck.rows.length > 0) return res.status(400).json({ error: 'Cannot archive vendor. It is associated with one or more active expenses.' });
        
        const quotationCheck = await db.query('SELECT id FROM quotations WHERE vendor_id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
        if (quotationCheck.rows.length > 0) return res.status(400).json({ error: 'Cannot archive vendor. It is associated with one or more active quotations.' });
        
        // If checks pass, use the generic soft delete logic
        return createSoftDeleteEndpoint('vendors')(req, res);
    } catch (err) {
        console.error('Failed to archive vendor:', err);
        res.status(500).json({ error: 'Failed to archive vendor' });
    }
});

router.get('/:id/history', authMiddleware, createHistoryEndpoint('vendors'));

module.exports = router;
