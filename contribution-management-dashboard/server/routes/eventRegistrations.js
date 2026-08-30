const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { serveImageString, serveMediaString, sanitizeRegistrationPayload } = require('../db/helpers');

const router = express.Router();

// GET single event registration details
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT er.id, er.event_id AS "eventId", er.name, er.email, 
                    er.form_data AS "formData", er.submitted_at AS "submittedAt", 
                    er.payment_proof_image AS "paymentProofImage",
                    e.name AS "eventName", e.event_date AS "eventDate", e.venue,
                    e.registration_form_schema AS "registrationFormSchema"
             FROM event_registrations er
             LEFT JOIN events e ON er.event_id = e.id
             WHERE er.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        res.json(sanitizeRegistrationPayload(result.rows[0]));
    } catch (err) {
        console.error(`Error fetching registration ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET registration payment proof image
router.get('/:id/payment-proof', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'SELECT payment_proof_image FROM event_registrations WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0 || !result.rows[0].payment_proof_image) {
            return res.status(404).json({ error: 'Payment proof image not found' });
        }
        return serveImageString(result.rows[0].payment_proof_image, res);
    } catch (err) {
        console.error(`Error streaming payment proof for registration ${id}:`, err);
        return res.status(500).json({ error: 'Failed to stream payment proof' });
    }
});

// GET registration uploaded file or audio by field key
router.get('/:id/files/:field', async (req, res) => {
    const { id, field } = req.params;
    try {
        const result = await db.query(
            'SELECT form_data FROM event_registrations WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0 || !result.rows[0].form_data) {
            return res.status(404).json({ error: 'Registration or data not found' });
        }

        const formData = result.rows[0].form_data || {};
        const fileData = formData[field];
        if (!fileData) {
            return res.status(404).json({ error: `File field '${field}' not found in registration` });
        }

        const customFilename = formData[`${field}_filename`] || null;
        return serveMediaString(fileData, res, req, customFilename);
    } catch (err) {
        console.error(`Error streaming file '${field}' for registration ${id}:`, err);
        return res.status(500).json({ error: 'Failed to stream file' });
    }
});

// GET registration primary audio track (convenience route)
router.get('/:id/audio', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'SELECT form_data FROM event_registrations WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0 || !result.rows[0].form_data) {
            return res.status(404).json({ error: 'Registration or data not found' });
        }

        const formData = result.rows[0].form_data || {};
        
        // Locate audio field
        let audioKey = null;
        let audioData = null;

        for (const [key, val] of Object.entries(formData)) {
            if (typeof val === 'string' && (val.startsWith('data:audio') || val.length > 500)) {
                if (key.toLowerCase().includes('audio') || key.toLowerCase().includes('song') || key.toLowerCase().includes('track') || key.toLowerCase().includes('music')) {
                    audioKey = key;
                    audioData = val;
                    break;
                }
            }
        }

        if (!audioData) {
            for (const [key, val] of Object.entries(formData)) {
                if (typeof val === 'string' && val.startsWith('data:audio')) {
                    audioKey = key;
                    audioData = val;
                    break;
                }
            }
        }

        if (!audioData) {
            return res.status(404).json({ error: 'No audio track found for this registration' });
        }

        const customFilename = audioKey ? (formData[`${audioKey}_filename`] || `${audioKey}.mp3`) : 'track.mp3';
        return serveMediaString(audioData, res, req, customFilename);
    } catch (err) {
        console.error(`Error streaming audio for registration ${id}:`, err);
        return res.status(500).json({ error: 'Failed to stream audio' });
    }
});

// DELETE a single event registration
router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM event_registrations WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registration not found.' });
        }
        res.status(204).send(); // No Content
    } catch (err) {
        console.error(`Error deleting event registration ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
