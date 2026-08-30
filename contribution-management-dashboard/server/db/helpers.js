const db = require('../db');

const logChanges = async (client, { historyTable, recordId, changedByUserId, oldData, newData, fieldMapping }) => {
    for (const key in newData) {
        const dbKey = fieldMapping[key];
        // Check if the key is in our mapping and if the value has changed.
        // Convert both values to string for a consistent comparison.
        if (dbKey && String(oldData[dbKey]) !== String(newData[key])) {
             await client.query(
                `INSERT INTO ${historyTable} (record_id, field_changed, old_value, new_value, changed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
                [recordId, key, oldData[dbKey], newData[key], changedByUserId]
            );
        }
    }
};

const createHistoryEndpoint = (tableName) => async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(`
            SELECT 
                h.id,
                h.field_changed AS "fieldChanged",
                h.old_value AS "oldValue",
                h.new_value AS "newValue",
                u.username AS "changedByUser",
                h.changed_at AS "changedAt"
            FROM ${tableName}_history h
            LEFT JOIN users u ON h.changed_by_user_id = u.id
            WHERE h.record_id = $1
            ORDER BY h.changed_at DESC
        `, [id]);
        res.json(rows);
    } catch (err) {
        console.error(`Error fetching ${tableName} history:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createSoftDeleteEndpoint = (tableName) => async (req, res) => {
    const { id } = req.params;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE ${tableName} SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Log the archival action to the item's history
        await client.query(
            `INSERT INTO ${tableName}_history (record_id, field_changed, old_value, new_value, changed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
            [id, 'status', 'active', 'archived', req.user.id]
        );

        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error(`Failed to archive from ${tableName}:`, err);
        res.status(500).json({ error: `Failed to archive from ${tableName}` }); 
    } finally {
        client.release();
    }
};

const serveImageString = (img, res) => {
    if (!img || typeof img !== 'string') {
        return res.status(404).json({ error: 'Image not found' });
    }
    const trimmed = img.trim();
    if (!trimmed || trimmed.startsWith('/api/')) {
        return res.status(404).json({ error: 'No valid image data' });
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return res.redirect(trimmed);
    }

    let contentType = 'image/jpeg';
    let base64Data = trimmed;

    if (trimmed.startsWith('data:')) {
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx !== -1) {
            const header = trimmed.substring(0, commaIdx);
            base64Data = trimmed.substring(commaIdx + 1);
            const mimeMatch = header.match(/data:([^;]+)/);
            if (mimeMatch && mimeMatch[1]) {
                contentType = mimeMatch[1];
            }
        }
    }

    const cleanBase64 = base64Data.replace(/\s/g, '');
    if (!cleanBase64) {
        return res.status(404).json({ error: 'Empty image payload' });
    }

    if (contentType === 'image/jpeg') {
        if (cleanBase64.startsWith('iVBORw0KG')) contentType = 'image/png';
        else if (cleanBase64.startsWith('R0lGOD')) contentType = 'image/gif';
        else if (cleanBase64.startsWith('UklGR')) contentType = 'image/webp';
    }

    try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
    } catch (err) {
        console.error('Error in serveImageString:', err);
        return res.status(500).json({ error: 'Failed to process image' });
    }
};

const serveMediaString = (dataStr, res, req, customFilename = null) => {
    if (!dataStr || typeof dataStr !== 'string') {
        return res.status(404).json({ error: 'Media not found' });
    }
    const trimmed = dataStr.trim();
    if (!trimmed || trimmed.startsWith('/api/')) {
        return res.status(404).json({ error: 'No valid media data' });
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return res.redirect(trimmed);
    }

    let contentType = 'application/octet-stream';
    let base64Data = trimmed;

    if (trimmed.startsWith('data:')) {
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx !== -1) {
            const header = trimmed.substring(0, commaIdx);
            base64Data = trimmed.substring(commaIdx + 1);
            const mimeMatch = header.match(/data:([^;]+)/);
            if (mimeMatch && mimeMatch[1]) {
                contentType = mimeMatch[1];
            }
        }
    }

    const cleanBase64 = base64Data.replace(/\s/g, '');
    if (!cleanBase64) {
        return res.status(404).json({ error: 'Empty media payload' });
    }

    // Auto-detect audio, image, and document MIME types if generic
    if (contentType === 'application/octet-stream' || contentType === 'application/x-download') {
        if (cleanBase64.startsWith('SUQz') || cleanBase64.startsWith('/+MY') || cleanBase64.startsWith('//tQ')) {
            contentType = 'audio/mpeg';
        } else if (cleanBase64.startsWith('RIFF') || cleanBase64.startsWith('UklGR')) {
            if (cleanBase64.substring(16, 28).includes('QVZF') || cleanBase64.includes('WAVE')) {
                contentType = 'audio/wav';
            } else {
                contentType = 'image/webp';
            }
        } else if (cleanBase64.startsWith('T2dnUw')) {
            contentType = 'audio/ogg';
        } else if (cleanBase64.startsWith('iVBORw0KG')) {
            contentType = 'image/png';
        } else if (cleanBase64.startsWith('/9j/')) {
            contentType = 'image/jpeg';
        } else if (cleanBase64.startsWith('JVBERi0')) {
            contentType = 'application/pdf';
        } else if (customFilename) {
            if (/\.(mp3)$/i.test(customFilename)) contentType = 'audio/mpeg';
            else if (/\.(wav)$/i.test(customFilename)) contentType = 'audio/wav';
            else if (/\.(ogg)$/i.test(customFilename)) contentType = 'audio/ogg';
            else if (/\.(m4a|aac)$/i.test(customFilename)) contentType = 'audio/mp4';
            else if (/\.(pdf)$/i.test(customFilename)) contentType = 'application/pdf';
            else if (/\.(png)$/i.test(customFilename)) contentType = 'image/png';
            else if (/\.(jpg|jpeg)$/i.test(customFilename)) contentType = 'image/jpeg';
        }
    }

    try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        const totalSize = buffer.length;

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (customFilename) {
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(customFilename)}"`);
        }

        // Support HTTP Range Requests for audio streaming / seeking in browser
        const range = req && req.headers && req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

            if (start >= totalSize || end >= totalSize || start > end) {
                res.setHeader('Content-Range', `bytes */${totalSize}`);
                return res.status(416).send('Requested Range Not Satisfiable');
            }

            const chunk = buffer.slice(start, end + 1);
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.setHeader('Content-Length', chunk.length);
            res.setHeader('Content-Type', contentType);
            return res.send(chunk);
        }

        res.setHeader('Content-Length', totalSize);
        res.setHeader('Content-Type', contentType);
        return res.send(buffer);
    } catch (err) {
        console.error('Error in serveMediaString:', err);
        return res.status(500).json({ error: 'Failed to process media' });
    }
};

/**
 * Strips heavy base64 fields (audio tracks, uploaded files, proof images) from registration
 * objects and replaces them with lightweight streaming URLs to prevent response payload limits.
 */
const sanitizeRegistrationPayload = (reg) => {
    if (!reg) return reg;
    const id = reg.id;

    let paymentProofImage = reg.paymentProofImage || reg.payment_proof_image;
    if (paymentProofImage && typeof paymentProofImage === 'string') {
        if (paymentProofImage.startsWith('data:') || (paymentProofImage.length > 250 && !paymentProofImage.startsWith('/api/') && !paymentProofImage.startsWith('http'))) {
            paymentProofImage = `/api/event-registrations/${id}/payment-proof`;
        }
    }

    let formData = reg.formData || reg.form_data || {};
    if (typeof formData === 'string') {
        try { formData = JSON.parse(formData); } catch (e) { formData = {}; }
    }

    const sanitizedFormData = { ...formData };
    for (const [key, val] of Object.entries(formData)) {
        if (typeof val === 'string') {
            // Replace data URL or large base64 string with streaming URL endpoint
            if (val.startsWith('data:') || (val.length > 300 && !val.includes(' ') && !val.startsWith('/api/') && !val.startsWith('http'))) {
                sanitizedFormData[key] = `/api/event-registrations/${id}/files/${encodeURIComponent(key)}`;
            }
        }
    }

    return {
        ...reg,
        paymentProofImage,
        formData: sanitizedFormData
    };
};

const logManagerApproval = async (clientOrDb, { userId, entityType, entityId, action = 'Approved', details = {} }) => {
    try {
        if (!userId) return;

        const { rows: userRoles } = await clientOrDb.query(
            `SELECT r.name 
             FROM roles r 
             JOIN user_roles ur ON r.id = ur.role_id 
             WHERE ur.user_id = $1`,
            [userId]
        );

        const roleNames = userRoles.map(r => r.name);
        const isManager = roleNames.includes('Manager') || roleNames.includes('Admin');

        if (isManager) {
            const userRole = roleNames.includes('Manager') ? 'Manager' : (roleNames[0] || 'Manager');
            await clientOrDb.query(
                `INSERT INTO manager_approval_audit (user_id, user_role, entity_type, entity_id, action, details)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, userRole, entityType, entityId, action, JSON.stringify(details)]
            );
        }
    } catch (err) {
        console.error('Failed to log manager approval audit:', err);
    }
};

module.exports = {
    logChanges,
    createHistoryEndpoint,
    createSoftDeleteEndpoint,
    serveImageString,
    serveMediaString,
    sanitizeRegistrationPayload,
    logManagerApproval
};
