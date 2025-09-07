const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const router = express.Router();

router.get('/users/management', authMiddleware, permissionMiddleware('page:user-management:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT u.id, u.username, u.created_at AS "createdAt", 
                   COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching users for management:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/users', authMiddleware, permissionMiddleware('action:users:manage'), async (req, res) => {
    const { username, password, roleIds } = req.body;
    if (!username || !password || !roleIds || !Array.isArray(roleIds)) {
        return res.status(400).json({ error: 'Username, password, and an array of roleIds are required.' });
    }
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const newUserRes = await client.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password]);
        const userId = newUserRes.rows[0].id;
        for (const roleId of roleIds) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'User created successfully', userId });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(409).json({ error: 'A user with this email already exists.' });
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.get('/roles', authMiddleware, permissionMiddleware('page:user-management:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description FROM roles ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/users/:id/roles', authMiddleware, permissionMiddleware('action:users:manage'), async (req, res) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) return res.status(400).json({ error: 'roleIds must be an array.' });

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        for (const roleId of roleIds) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, roleId]);
        }
        await client.query('COMMIT');
        // Invalidate all sessions for this user to force re-login with new permissions
        await db.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
        res.status(200).json({ message: 'User roles updated successfully. User sessions have been cleared.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating user roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
