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
            `SELECT id, festival_id as "festivalId", name, event_date as "eventDate", to_char(start_time, 'HH24:MI') as "startTime", to_char(end_time, 'HH24:MI') as "endTime", description, image_data as "image", venue, created_at as "createdAt", updated_at as "updatedAt"
             FROM events WHERE festival_id = $1 AND deleted_at IS NULL ORDER BY event_date, start_time`, [id]
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

// Note: Event POST, PUT, DELETE, History are in their own router file for consistency.
// Oh, wait, the original file had them here. I will put them in a dedicated events.js
// No, the original file has everything in server.js. The current routing structure has `/festivals/:id/events`.
// It makes sense to keep them here for now to match the URL structure.
// I will keep the event routes here.
// But the DELETE is generic, and it's /api/events/:id... okay I will make a separate events.js.
// This is getting complex. The original file has `app.delete('/api/events/:id', ...)`
// Let's create `events.js` to be cleaner.
// No, let's look at App.tsx `handleDeleteClick(id, 'events')`. This calls `DELETE /api/events/123`.
// Okay, so the routes are not nested under festivals.
// This means I need to create a separate `routes/events.js`.
// But the GET is `/festivals/:id/events`. This is inconsistent.
// I'll stick to the original file's logic. All event routes will go into a separate file for clarity, and I'll adjust the main server file to mount it at `/api/events`. The GET route will also be moved there and changed.
// No, the user wants me to split the file. The frontend expects GET /api/festivals/:id/events.
// And DELETE /api/events/:id. This is a design flaw in the original app.
// I will keep the GET here, and create `events.js` for the others.
// This is confusing. Let's group all logic related to an entity in one file.
// So, event logic goes into `events.js`. The `GET` route should probably be moved there and changed to `/api/events?festivalId=:id`.
// But that would require a frontend change, which is out of scope.
// I will keep the original routing structure.
// So, `GET /festivals/:id/events` stays here in `festivals.js`.
// The other event routes (POST, PUT, DELETE, history) will be in a new `events.js` file.
// This seems like the most faithful refactoring.

// ... But wait, the original server.js only has a GET for events under `/festivals/:id/events`.
// The POST, PUT, DELETE, and history routes are generic:
// app.post('/api/events', ...)
// app.put('/api/events/:id', ...)
// app.delete('/api/events/:id', ...)
// app.get('/api/events/:id/history', ...)
// This confirms they should be in a separate `events.js` file.
// So `festivals.js` will only contain festival logic + the nested GET for events and photos.

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

// Note: DELETE for a single photo is at /api/photos/:id
// It should be here. I'll add another router file for `photos`.
// Let's create `routes/photos.js`.
// No, this is getting too granular. Let's put it here.
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
