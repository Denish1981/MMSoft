const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/public/albums', async (req, res) => {
    try {
        const { rows } = await db.query(`
            WITH FestivalImages AS (
                SELECT 
                    festival_id, 
                    image_data,
                    ROW_NUMBER() OVER(PARTITION BY festival_id ORDER BY created_at DESC) as rn
                FROM festival_photos
            )
            SELECT 
                f.id, 
                f.name, 
                f.description, 
                fi.image_data as "coverImage"
            FROM festivals f
            LEFT JOIN FestivalImages fi ON f.id = fi.festival_id AND fi.rn = 1
            WHERE f.deleted_at IS NULL
            ORDER BY f.start_date DESC;
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching public albums:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/public/albums/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const festivalRes = await db.query('SELECT name, description, start_date as "startDate", end_date as "endDate" FROM festivals WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (festivalRes.rows.length === 0) {
            return res.status(404).json({ error: 'Album not found' });
        }
        
        const imagesRes = await db.query(`
            SELECT image_data FROM festival_photos WHERE festival_id = $1 ORDER BY created_at ASC
        `, [id]);

        res.json({
            ...festivalRes.rows[0],
            images: imagesRes.rows.map(r => r.image_data)
        });

    } catch (err) {
        console.error(`Error fetching public album ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
