const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:budget:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead", festival_id as "festivalId", created_at AS "createdAt", updated_at AS "updatedAt" FROM budgets WHERE deleted_at IS NULL ORDER BY item_name ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { itemName, budgetedAmount, expenseHead, festivalId } = req.body;
    try {
        const result = await db.query('INSERT INTO budgets (item_name, budgeted_amount, expense_head, festival_id) VALUES ($1, $2, $3, $4) RETURNING id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead", festival_id AS "festivalId", created_at as "createdAt", updated_at as "updatedAt"', 
            [itemName, budgetedAmount, expenseHead, festivalId || null]);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { itemName, budgetedAmount, expenseHead, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM budgets WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Budget item not found');

        const result = await client.query('UPDATE budgets SET item_name=$1, budgeted_amount=$2, expense_head=$3, festival_id=$4, updated_at=NOW() WHERE id=$5 RETURNING id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead", festival_id AS "festivalId", created_at as "createdAt", updated_at as "updatedAt"',
            [itemName, budgetedAmount, expenseHead, festivalId || null, id]);

        await logChanges(client, {
            historyTable: 'budgets_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { itemName: 'item_name', budgetedAmount: 'budgeted_amount', expenseHead: 'expense_head', festivalId: 'festival_id' }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update budget' }); 
    } finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('budgets'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('budgets'));

module.exports = router;
