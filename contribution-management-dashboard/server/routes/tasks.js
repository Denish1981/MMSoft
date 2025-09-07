const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:tasks:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, title, description, status, due_date as "dueDate", festival_id as "festivalId", assignee_name as "assigneeName", created_at as "createdAt", updated_at as "updatedAt" FROM tasks WHERE deleted_at IS NULL ORDER BY due_date ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { title, description, status, dueDate, festivalId, assigneeName } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO tasks (title, description, status, due_date, festival_id, assignee_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, status, due_date as "dueDate", festival_id as "festivalId", assignee_name as "assigneeName", created_at as "createdAt", updated_at as "updatedAt"',
            [title, description, status, dueDate, festivalId || null, assigneeName]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { title, description, status, dueDate, festivalId, assigneeName } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldTaskRes = await client.query('SELECT * FROM tasks WHERE id = $1 FOR UPDATE', [id]);
        if (oldTaskRes.rows.length === 0) throw new Error('Task not found');
        
        const result = await client.query(
            'UPDATE tasks SET title=$1, description=$2, status=$3, due_date=$4, festival_id=$5, assignee_name=$6, updated_at=NOW() WHERE id=$7 RETURNING id, title, description, status, due_date as "dueDate", festival_id as "festivalId", assignee_name as "assigneeName", created_at as "createdAt", updated_at as "updatedAt"',
            [title, description, status, dueDate, festivalId || null, assigneeName, id]
        );

        await logChanges(client, {
            historyTable: 'task_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldTaskRes.rows[0], newData: req.body,
            fieldMapping: { title: 'title', description: 'description', status: 'status', dueDate: 'due_date', festivalId: 'festival_id', assigneeName: 'assignee_name' }
        });
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.message === 'Task not found') return res.status(404).json({ error: 'Task not found' });
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('tasks'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('task'));

module.exports = router;
