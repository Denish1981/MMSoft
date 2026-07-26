const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

// Helper to fetch entries for a list of schedule IDs
async function attachEntries(schedules) {
    if (!schedules || schedules.length === 0) return schedules;
    const ids = schedules.map(s => s.id);
    const { rows: entries } = await db.query(
        `SELECT id, schedule_id as "scheduleId", event_date as "eventDate", day, event, timings, created_at as "createdAt"
         FROM schedule_entries
         WHERE schedule_id = ANY($1::int[])
         ORDER BY event_date ASC, timings ASC`,
        [ids]
    );

    const entriesBySchedule = {};
    for (const entry of entries) {
        if (!entriesBySchedule[entry.scheduleId]) {
            entriesBySchedule[entry.scheduleId] = [];
        }
        entriesBySchedule[entry.scheduleId].push(entry);
    }

    for (const sched of schedules) {
        sched.entries = entriesBySchedule[sched.id] || [];
    }
    return schedules;
}

// GET /api/schedules
router.get('/', authMiddleware, permissionMiddleware('page:schedules:view'), async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id, 
                s.festival_id as "festivalId", 
                f.name as "festivalName", 
                s.title, 
                s.start_date as "startDate", 
                s.end_date as "endDate", 
                s.is_active as "isActive", 
                s.created_at as "createdAt", 
                s.updated_at as "updatedAt"
            FROM schedules s
            LEFT JOIN festivals f ON s.festival_id = f.id
            WHERE s.deleted_at IS NULL
            ORDER BY s.is_active DESC, s.start_date DESC
        `;
        const { rows } = await db.query(query);
        const result = await attachEntries(rows);
        res.json(result);
    } catch (err) {
        console.error('Error fetching schedules:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/schedules/:id
router.get('/:id', authMiddleware, permissionMiddleware('page:schedules:view'), async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                s.id, 
                s.festival_id as "festivalId", 
                f.name as "festivalName", 
                s.title, 
                s.start_date as "startDate", 
                s.end_date as "endDate", 
                s.is_active as "isActive", 
                s.created_at as "createdAt", 
                s.updated_at as "updatedAt"
            FROM schedules s
            LEFT JOIN festivals f ON s.festival_id = f.id
            WHERE s.id = $1 AND s.deleted_at IS NULL
        `;
        const { rows } = await db.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
        const result = await attachEntries(rows);
        res.json(result[0]);
    } catch (err) {
        console.error(`Error fetching schedule ${req.params.id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/schedules
router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { festivalId, title, startDate, endDate, isActive, entries = [] } = req.body;

    if (!festivalId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Festival ID, Start Date, and End Date are required.' });
    }

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');

        // If this schedule is marked active, deactivate other schedules for the same festival
        if (isActive) {
            await client.query('UPDATE schedules SET is_active = false WHERE festival_id = $1', [festivalId]);
        }

        const insertMasterRes = await client.query(
            `INSERT INTO schedules (festival_id, title, start_date, end_date, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, festival_id as "festivalId", title, start_date as "startDate", end_date as "endDate", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
            [festivalId, title || null, startDate, endDate, Boolean(isActive)]
        );

        const scheduleMaster = insertMasterRes.rows[0];

        // Insert entries
        const createdEntries = [];
        for (const item of entries) {
            if (item.eventDate && item.event && item.timings) {
                const entryRes = await client.query(
                    `INSERT INTO schedule_entries (schedule_id, event_date, day, event, timings)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, schedule_id as "scheduleId", event_date as "eventDate", day, event, timings, created_at as "createdAt"`,
                    [scheduleMaster.id, item.eventDate, item.day || null, item.event, item.timings]
                );
                createdEntries.push(entryRes.rows[0]);
            }
        }

        await client.query('COMMIT');
        
        // Get festival name
        const festRes = await db.query('SELECT name FROM festivals WHERE id = $1', [festivalId]);
        scheduleMaster.festivalName = festRes.rows[0]?.name || '';
        scheduleMaster.entries = createdEntries;

        res.status(201).json(scheduleMaster);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating schedule:', err);
        res.status(500).json({ error: 'Failed to create schedule' });
    } finally {
        client.release();
    }
});

// PUT /api/schedules/:id
router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { festivalId, title, startDate, endDate, isActive, entries = [] } = req.body;

    if (!festivalId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Festival ID, Start Date, and End Date are required.' });
    }

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');

        const oldDataRes = await client.query('SELECT * FROM schedules WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Schedule not found' });
        }

        if (isActive) {
            await client.query('UPDATE schedules SET is_active = false WHERE festival_id = $1 AND id != $2', [festivalId, id]);
        }

        const updateRes = await client.query(
            `UPDATE schedules 
             SET festival_id=$1, title=$2, start_date=$3, end_date=$4, is_active=$5, updated_at=NOW()
             WHERE id=$6
             RETURNING id, festival_id as "festivalId", title, start_date as "startDate", end_date as "endDate", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
            [festivalId, title || null, startDate, endDate, Boolean(isActive), id]
        );

        const updatedMaster = updateRes.rows[0];

        // Replace schedule entries
        await client.query('DELETE FROM schedule_entries WHERE schedule_id = $1', [id]);

        const newEntries = [];
        for (const item of entries) {
            if (item.eventDate && item.event && item.timings) {
                const entryRes = await client.query(
                    `INSERT INTO schedule_entries (schedule_id, event_date, day, event, timings)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, schedule_id as "scheduleId", event_date as "eventDate", day, event, timings, created_at as "createdAt"`,
                    [id, item.eventDate, item.day || null, item.event, item.timings]
                );
                newEntries.push(entryRes.rows[0]);
            }
        }

        await logChanges(client, {
            historyTable: 'schedules_history',
            recordId: id,
            changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0],
            newData: req.body,
            fieldMapping: {
                festivalId: 'festival_id',
                title: 'title',
                startDate: 'start_date',
                endDate: 'end_date',
                isActive: 'is_active'
            }
        });

        await client.query('COMMIT');

        const festRes = await db.query('SELECT name FROM festivals WHERE id = $1', [festivalId]);
        updatedMaster.festivalName = festRes.rows[0]?.name || '';
        updatedMaster.entries = newEntries;

        res.json(updatedMaster);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error updating schedule ${id}:`, err);
        res.status(500).json({ error: 'Failed to update schedule' });
    } finally {
        client.release();
    }
});

// PATCH /api/schedules/:id/toggle-active
router.patch('/:id/toggle-active', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');

        const schedRes = await client.query('SELECT festival_id FROM schedules WHERE id = $1', [id]);
        if (schedRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const festivalId = schedRes.rows[0].festival_id;

        if (isActive) {
            await client.query('UPDATE schedules SET is_active = false WHERE festival_id = $1', [festivalId]);
        }

        await client.query('UPDATE schedules SET is_active = $1, updated_at = NOW() WHERE id = $2', [Boolean(isActive), id]);

        await client.query('COMMIT');
        res.json({ message: 'Schedule active state updated', id, isActive: Boolean(isActive) });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error toggling schedule active state:', err);
        res.status(500).json({ error: 'Failed to update schedule status' });
    } finally {
        client.release();
    }
});

// DELETE /api/schedules/entries/:entryId
router.delete('/entries/:entryId', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    try {
        const { entryId } = req.params;
        const result = await db.query('DELETE FROM schedule_entries WHERE id = $1', [entryId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Schedule entry not found' });
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting schedule entry:', err);
        res.status(500).json({ error: 'Failed to delete schedule entry' });
    }
});

// DELETE /api/schedules/:id
router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('schedules'));

// GET /api/schedules/:id/history
router.get('/:id/history', authMiddleware, createHistoryEndpoint('schedules'));

module.exports = router;
