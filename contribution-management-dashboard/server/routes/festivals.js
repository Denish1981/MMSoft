
const express = require('express');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

// Auto-migrate festival_photos table columns if they do not already exist
db.query(`
    ALTER TABLE festival_photos ADD COLUMN IF NOT EXISTS folder VARCHAR(255) DEFAULT 'General';
    ALTER TABLE festival_photos ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'image';
`).catch(err => {
    console.warn('Notice: festival_photos table check/migration:', err.message);
});

// Helper to initialize Cloudflare R2 S3-compatible Client
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) return null;

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

function getR2PublicUrl(key) {
    const bucketName = process.env.R2_BUCKET_NAME;
    const accountId = process.env.R2_ACCOUNT_ID;
    let base = process.env.R2_PUBLIC_URL ? process.env.R2_PUBLIC_URL.trim().replace(/\/$/, '') : '';
    if (!base && bucketName && accountId) {
        base = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
    }
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    return base ? `${base}/${encodedKey}` : `/${encodedKey}`;
}

async function deleteFromR2(key) {
    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!r2Client || !bucketName || !key) return;

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        await r2Client.send(command);
    } catch (e) {
        console.warn('Failed to delete asset from Cloudflare R2:', e.message);
    }
}

function isVideoContentTypeOrName(contentType, fileName) {
    if (contentType && contentType.startsWith('video/')) return true;
    if (fileName && /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(fileName)) return true;
    return false;
}

// Generate presigned PUT URL(s) for direct browser upload to Cloudflare R2.
// Supports both GET (single file query) and POST (batch or single payload).
router.all('/photos/sign-upload', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(500).json({
            error: 'Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not configured on the server.'
        });
    }

    const r2Client = getR2Client();
    if (!r2Client) {
        return res.status(500).json({ error: 'Failed to initialize Cloudflare R2 client.' });
    }

    const festivalId = (req.method === 'POST' ? req.body.festivalId : req.query.festivalId) || 'general';
    const rawFolder = (req.method === 'POST' ? req.body.folder : req.query.folder) || 'General';
    // Clean folder string to alphanumeric, dashes, underscores, and spaces
    const cleanFolder = String(rawFolder).trim().replace(/[\\/:*?"<>|]+/g, '_').trim() || 'General';

    try {
        let requestedFiles = [];
        if (req.method === 'POST' && Array.isArray(req.body.files) && req.body.files.length > 0) {
            requestedFiles = req.body.files;
        } else {
            const fileName = (req.method === 'POST' ? req.body.fileName : req.query.fileName) || 'file.bin';
            const contentType = (req.method === 'POST' ? req.body.contentType : req.query.contentType) || 'application/octet-stream';
            requestedFiles = [{ fileName, contentType }];
        }

        const signedUploads = [];
        for (const item of requestedFiles) {
            const rawFileName = item.fileName || 'media';
            const cleanFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniquePrefix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
            const objectKey = `festivals/${festivalId}/${cleanFolder}/${uniquePrefix}-${cleanFileName}`;
            const contentType = item.contentType || (isVideoContentTypeOrName(item.contentType, cleanFileName) ? 'video/mp4' : 'image/jpeg');

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
                ContentType: contentType,
            });

            // Presign PUT URL for 1 hour (3600 seconds)
            const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
            const publicUrl = getR2PublicUrl(objectKey);
            const mediaType = isVideoContentTypeOrName(contentType, cleanFileName) ? 'video' : 'image';

            signedUploads.push({
                uploadUrl,
                publicUrl,
                key: objectKey,
                folder: cleanFolder,
                fileName: rawFileName,
                contentType,
                mediaType
            });
        }

        if (signedUploads.length === 1 && req.method === 'GET') {
            return res.json(signedUploads[0]);
        }

        res.json({
            uploads: signedUploads,
            folder: cleanFolder,
            festivalId
        });
    } catch (err) {
        console.error('Error generating Cloudflare R2 upload URL:', err);
        res.status(500).json({ error: 'Failed to generate Cloudflare R2 upload authorization: ' + err.message });
    }
});

// Fallback server upload route for R2 (e.g., if direct browser PUT experiences strict bucket CORS)
router.post('/photos/direct-upload', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { festivalId = 'general', folder = 'General', fileName = 'file.bin', fileData, contentType = 'image/jpeg' } = req.body;
    const bucketName = process.env.R2_BUCKET_NAME;
    const r2Client = getR2Client();

    if (!r2Client || !bucketName) {
        return res.status(500).json({ error: 'Cloudflare R2 is not configured.' });
    }
    if (!fileData) {
        return res.status(400).json({ error: 'No file data provided.' });
    }

    try {
        const cleanFolder = String(folder).trim().replace(/[\\/:*?"<>|]+/g, '_').trim() || 'General';
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectKey = `festivals/${festivalId}/${cleanFolder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanFileName}`;
        
        // Convert base64 data to buffer
        const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
        const fileBuffer = Buffer.from(base64Data, 'base64');

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await r2Client.send(command);
        const publicUrl = getR2PublicUrl(objectKey);
        const mediaType = isVideoContentTypeOrName(contentType, cleanFileName) ? 'video' : 'image';

        res.json({
            publicUrl,
            key: objectKey,
            folder: cleanFolder,
            mediaType
        });
    } catch (err) {
        console.error('Direct upload to R2 error:', err);
        res.status(500).json({ error: 'Failed to upload file to Cloudflare R2: ' + err.message });
    }
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
            SELECT 
                fp.id, 
                fp.image_data AS "imageData", 
                fp.public_id AS "publicId", 
                COALESCE(fp.folder, 'General') AS "folder",
                COALESCE(fp.media_type, 'image') AS "mediaType",
                u.username AS "uploadedBy",
                fp.created_at AS "createdAt"
            FROM festival_photos fp
            LEFT JOIN users u ON fp.uploaded_by_user_id = u.id
            WHERE fp.festival_id = $1
            ORDER BY fp.created_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error('Failed to fetch photos:', err);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

router.post('/:id/photos', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { images, photos, folder } = req.body;
    const photoList = [];

    const defaultFolder = (folder && typeof folder === 'string' && folder.trim()) ? folder.trim() : 'General';

    if (Array.isArray(photos) && photos.length > 0) {
        for (const p of photos) {
            if (typeof p === 'string') {
                const isVid = isVideoContentTypeOrName(null, p);
                photoList.push({ 
                    url: p, 
                    publicId: null, 
                    folder: defaultFolder,
                    mediaType: isVid ? 'video' : 'image'
                });
            } else if (p && p.url) {
                const itemFolder = (p.folder && typeof p.folder === 'string' && p.folder.trim()) ? p.folder.trim() : defaultFolder;
                const isVid = p.mediaType === 'video' || isVideoContentTypeOrName(null, p.url);
                photoList.push({ 
                    url: p.url, 
                    publicId: p.publicId || p.key || null, 
                    folder: itemFolder,
                    mediaType: p.mediaType || (isVid ? 'video' : 'image')
                });
            }
        }
    } else if (Array.isArray(images) && images.length > 0) {
        for (const img of images) {
            const isVid = isVideoContentTypeOrName(null, img);
            photoList.push({ 
                url: img, 
                publicId: null, 
                folder: defaultFolder,
                mediaType: isVid ? 'video' : 'image'
            });
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
                `INSERT INTO festival_photos (festival_id, image_data, public_id, folder, media_type, uploaded_by_user_id) 
                 VALUES ($1, $2, $3, $4, $5, $6)`, 
                [req.params.id, item.url, item.publicId, item.folder || 'General', item.mediaType || 'image', req.user.id]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Media uploaded successfully', count: photoList.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to upload photos/videos:', err);
        res.status(500).json({ error: 'Failed to upload photos/videos' });
    } finally { client.release(); }
});

router.delete('/photos/:photoId', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    try {
        const checkRes = await db.query('SELECT id, image_data AS "imageData", public_id AS "publicId" FROM festival_photos WHERE id = $1', [req.params.photoId]);
        if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Photo not found' });

        const photo = checkRes.rows[0];
        await db.query('DELETE FROM festival_photos WHERE id = $1', [req.params.photoId]);

        // Attempt deletion of asset from Cloudflare R2 if publicId / key exists
        let objectKey = photo.publicId;
        if (!objectKey && photo.imageData && !photo.imageData.startsWith('data:')) {
            // Check if URL matches Cloudflare R2 path or bucket URL
            try {
                const parsedUrl = new URL(photo.imageData);
                // Strip leading slash
                objectKey = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        if (objectKey) {
            deleteFromR2(objectKey).catch(() => {});
        }

        res.status(204).send();
    } catch(err) { 
        console.error('Failed to delete media:', err);
        res.status(500).json({ error: 'Failed to delete media' }); 
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
