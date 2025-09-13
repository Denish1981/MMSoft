const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

// --- Festivals ---
router.get('/', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", created_at AS "createdAt", updated_at AS "updatedAt" FROM festivals WHERE deleted_at IS NULL ORDER BY start_date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name FROM festivals WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Festival not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, description, startDate, endDate, campaignId } = req.body;
    const dbCampaignId = campaignId || null;
    try {
        const result = await db.query('INSERT INTO festivals (name, description, start_date, end_date, campaign_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", created_at as "createdAt", updated_at as "updatedAt"',
            [name, description, startDate, endDate, dbCampaignId]);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, description, startDate, endDate, campaignId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM festivals WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Festival not found');
        
        const result = await client.query('UPDATE festivals SET name=$1, description=$2, start_date=$3, end_date=$4, campaign_id=$5, updated_at=NOW() WHERE id=$6 RETURNING id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", created_at as "createdAt", updated_at as "updatedAt"',
            [name, description, startDate, endDate, campaignId || null, id]);
        
        await logChanges(client, {
            historyTable: 'festivals_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { name: 'name', description: 'description', startDate: 'start_date', endDate: 'end_date', campaignId: 'campaign_id' }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update festival' }); 
    } finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('festivals'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('festivals'));

// --- Festival Events ---
router.get('/:id/events', authMiddleware, permissionMiddleware('page:events:view'), async (req, res) => {
    const { id } = req.params;
    try {
        const eventsRes = await db.query(
            `SELECT 
                e.id, e.festival_id as "festivalId", e.name, e.event_date as "eventDate", 
                to_char(e.start_time, 'HH24:MI') as "startTime", to_char(e.end_time, 'HH24:MI') as "endTime", 
                e.description, e.image_data as "image", e.venue, e.registration_form_schema as "registrationFormSchema",
                e.created_at as "createdAt", e.updated_at as "updatedAt",
                COUNT(er.id)::int as "registrationCount"
             FROM events e
             LEFT JOIN event_registrations er ON e.id = er.event_id
             WHERE e.festival_id = $1 AND e.deleted_at IS NULL 
             GROUP BY e.id
             ORDER BY e.event_date, e.start_time`, [id]
        );
        const events = eventsRes.rows;
        for (const event of events) {
            const contactsRes = await db.query(
                'SELECT name, contact_number as "contactNumber", email FROM event_contact_persons WHERE event_id = $1', [event.id]
            );
            event.contactPersons = contactsRes.rows;
        }
        res.json(events);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Festival Photo Management ---
router.get('/:id/photos', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                fp.id, 
                fp.image_data as "imageData",
                u.username as "uploadedBy"
            FROM festival_photos fp
            LEFT JOIN users u ON fp.uploaded_by_user_id = u.id
            WHERE fp.festival_id = $1 
            ORDER BY fp.created_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

router.post('/:id/photos', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { images } = req.body; // Expect an array of base64 strings
    const userId = req.user.id; // Get user ID from middleware

    if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Images array is required.' });
    }

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        for (const imageData of images) {
            await client.query('INSERT INTO festival_photos (festival_id, image_data, uploaded_by_user_id) VALUES ($1, $2, $3)', [id, imageData, userId]);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Photos uploaded successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to upload photos:', err);
        res.status(500).json({ error: 'Failed to upload photos.' });
    } finally {
        client.release();
    }
});

router.delete('/photos/:photoId', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    try {
        const result = await db.query('DELETE FROM festival_photos WHERE id = $1', [req.params.photoId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Photo not found.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Failed to delete photo:', err);
        res.status(500).json({ error: 'Failed to delete photo.' });
    }
});

module.exports = router;