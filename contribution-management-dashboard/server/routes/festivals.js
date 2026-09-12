
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

async function deleteFromCloudinary(publicId) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret || !publicId) return;

    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        const formData = new URLSearchParams();
        formData.append('public_id', publicId);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);

        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    } catch (e) {
        console.warn('Failed to delete asset from Cloudinary:', e.message);
    }
}

// Generate an HMAC-SHA1 signature for secure direct client-side upload to Cloudinary.
// Accessible strictly to authenticated users with 'action:edit' permission.
router.get('/photos/sign-upload', authMiddleware, permissionMiddleware('action:edit'), (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({
            error: 'Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured on the server.'
        });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const festivalId = req.query.festivalId ? String(req.query.festivalId) : 'general';
    const folder = `gtmm-festivals/${festivalId}`;

    const paramsToSign = {
        folder,
        timestamp
    };

    const sortedParams = Object.keys(paramsToSign)
        .sort()
        .map(key => `${key}=${paramsToSign[key]}`)
        .join('&');

    const signature = crypto
        .createHash('sha1')
        .update(sortedParams + apiSecret)
        .digest('hex');

    res.json({
        signature,
        timestamp,
        folder,
        apiKey,
        cloudName
    });
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", stall_price_per_table_per_day as "stallPricePerTablePerDay", stall_electricity_cost_per_day as "stallElectricityCostPerDay", stall_start_date as "stallStartDate", stall_end_date as "stallEndDate", max_stalls as "maxStalls", created_at as "createdAt", updated_at as "updatedAt" FROM festivals WHERE deleted_at IS NULL ORDER BY start_date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", stall_price_per_table_per_day as "stallPricePerTablePerDay", stall_electricity_cost_per_day as "stallElectricityCostPerDay", stall_start_date as "stallStartDate", stall_end_date as "stallEndDate", max_stalls as "maxStalls", created_at as "createdAt", updated_at as "updatedAt" FROM festivals WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Festival not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});


router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, description, startDate, endDate, campaignId, stallPricePerTablePerDay, stallElectricityCostPerDay, stallStartDate, stallEndDate, maxStalls } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO festivals (name, description, start_date, end_date, campaign_id, stall_price_per_table_per_day, stall_electricity_cost_per_day, stall_start_date, stall_end_date, max_stalls) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", stall_price_per_table_per_day as "stallPricePerTablePerDay", stall_electricity_cost_per_day as "stallElectricityCostPerDay", stall_start_date as "stallStartDate", stall_end_date as "stallEndDate", max_stalls as "maxStalls", created_at as "createdAt", updated_at as "updatedAt"',
            [name, description, startDate, endDate, campaignId, stallPricePerTablePerDay || null, stallElectricityCostPerDay || null, stallStartDate || null, stallEndDate || null, maxStalls || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, description, startDate, endDate, campaignId, stallPricePerTablePerDay, stallElectricityCostPerDay, stallStartDate, stallEndDate, maxStalls } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM festivals WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Festival not found');
        
        const result = await client.query(
            'UPDATE festivals SET name=$1, description=$2, start_date=$3, end_date=$4, campaign_id=$5, stall_price_per_table_per_day=$6, stall_electricity_cost_per_day=$7, stall_start_date=$8, stall_end_date=$9, max_stalls=$10, updated_at=NOW() WHERE id=$11 RETURNING id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", stall_price_per_table_per_day as "stallPricePerTablePerDay", stall_electricity_cost_per_day as "stallElectricityCostPerDay", stall_start_date as "stallStartDate", stall_end_date as "stallEndDate", max_stalls as "maxStalls", created_at as "createdAt", updated_at as "updatedAt"',
            [name, description, startDate, endDate, campaignId, stallPricePerTablePerDay || null, stallElectricityCostPerDay || null, stallStartDate || null, stallEndDate || null, maxStalls || null, id]
        );

        await logChanges(client, {
            historyTable: 'festivals_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { name: 'name', description: 'description', startDate: 'start_date', endDate: 'end_date', campaignId: 'campaign_id', stallPricePerTablePerDay: 'stall_price_per_table_per_day', stallElectricityCostPerDay: 'stall_electricity_cost_per_day', stallStartDate: 'stall_start_date', stallEndDate: 'stall_end_date', maxStalls: 'max_stalls' }
        });
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to update festival' }); }
    finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('festivals'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('festivals'));

router.get('/:id/events', authMiddleware, permissionMiddleware('page:events:view'), async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                e.id, 
                e.festival_id as "festivalId", 
                e.name, 
                e.description, 
                e.rules,
                e.event_date as "eventDate", 
                e.start_time as "startTime", 
                e.end_time as "endTime", 
                e.venue, 
                e.image_data as "image", 
                e.registration_deadline as "registrationDeadline",
                e.registration_form_schema as "registrationFormSchema",
                e.is_group_event as "isGroupEvent",
                e.min_group_size as "minGroupSize",
                e.max_group_size as "maxGroupSize",
                e.allow_duplicate_members as "allowDuplicateMembers",
                (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as "registrationCount"
            FROM events e
            WHERE e.festival_id = $1 AND e.deleted_at IS NULL
            ORDER BY e.event_date ASC, e.start_time ASC
        `;
        const { rows: events } = await db.query(query, [id]);
        
        for (const event of events) {
             const contactsRes = await db.query('SELECT name, contact_number as "contactNumber", email FROM event_contact_persons WHERE event_id = $1', [event.id]);
             event.contactPersons = contactsRes.rows;
             event.isGroupEvent = Boolean(event.isGroupEvent);
             event.minGroupSize = event.minGroupSize || 1;
             event.maxGroupSize = event.maxGroupSize || 20;
             event.allowDuplicateMembers = Boolean(event.allowDuplicateMembers);
             if (typeof event.registrationFormSchema === 'string') {
                 try {
                     event.registrationFormSchema = JSON.parse(event.registrationFormSchema);
                 } catch (e) {
                     event.registrationFormSchema = [];
                 }
             }
             if (event.startTime) event.startTime = event.startTime.substring(0, 5);
             if (event.endTime) event.endTime = event.endTime.substring(0, 5);
        }

        res.json(events);
    } catch (err) {
        console.error(`Error fetching events for festival ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/photos', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT fp.id, fp.image_data AS "imageData", fp.public_id AS "publicId", u.username AS "uploadedBy" 
            FROM festival_photos fp
            LEFT JOIN users u ON fp.uploaded_by_user_id = u.id
            WHERE fp.festival_id = $1
            ORDER BY fp.created_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch photos' }); }
});

router.post('/:id/photos', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { images, photos } = req.body;
    const photoList = [];

    if (Array.isArray(photos) && photos.length > 0) {
        for (const p of photos) {
            if (typeof p === 'string') {
                photoList.push({ url: p, publicId: null });
            } else if (p && p.url) {
                photoList.push({ url: p.url, publicId: p.publicId || null });
            }
        }
    } else if (Array.isArray(images) && images.length > 0) {
        for (const img of images) {
            photoList.push({ url: img, publicId: null });
        }
    }

    if (photoList.length === 0) {
        return res.status(400).json({ error: 'Photos or images array is required.' });
    }
    
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        for (const item of photoList) {
            await client.query(
                'INSERT INTO festival_photos (festival_id, image_data, public_id, uploaded_by_user_id) VALUES ($1, $2, $3, $4)', 
                [req.params.id, item.url, item.publicId, req.user.id]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Photos uploaded successfully', count: photoList.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to upload photos:', err);
        res.status(500).json({ error: 'Failed to upload photos' });
    } finally { client.release(); }
});

router.delete('/photos/:photoId', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    try {
        const checkRes = await db.query('SELECT id, image_data AS "imageData", public_id AS "publicId" FROM festival_photos WHERE id = $1', [req.params.photoId]);
        if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Photo not found' });

        const photo = checkRes.rows[0];
        await db.query('DELETE FROM festival_photos WHERE id = $1', [req.params.photoId]);

        // Attempt background deletion of Cloudinary asset if publicId exists or can be determined
        let publicId = photo.publicId;
        if (!publicId && photo.imageData && photo.imageData.includes('cloudinary.com')) {
            const match = photo.imageData.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
            if (match) publicId = match[1];
        }
        if (publicId) {
            deleteFromCloudinary(publicId).catch(() => {});
        }

        res.status(204).send();
    } catch(err) { 
        console.error('Failed to delete photo:', err);
        res.status(500).json({ error: 'Failed to delete photo' }); 
    }
});

router.get('/:id/stall-registrations', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                sr.id, sr.festival_id as "festivalId", sr.registrant_name as "registrantName", sr.contact_number as "contactNumber",
                sr.stall_dates::TEXT[] as "stallDates", sr.products,
                sr.needs_electricity as "needsElectricity", sr.number_of_tables as "numberOfTables",
                sr.total_payment as "totalPayment", sr.payment_screenshot as "paymentScreenshot", sr.submitted_at as "submittedAt",
                sr.status, sr.rejection_reason as "rejectionReason", sr.reviewed_at as "reviewedAt", u.username as "reviewedBy"
            FROM stall_registrations sr
            LEFT JOIN users u ON sr.reviewed_by_user_id = u.id
            WHERE sr.festival_id = $1
            ORDER BY sr.submitted_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching stall registrations:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
