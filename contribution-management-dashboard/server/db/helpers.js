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

module.exports = {
    logChanges,
    createHistoryEndpoint,
    createSoftDeleteEndpoint,
    serveImageString
};
