const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

router.get('/', authMiddleware, permissionMiddleware('page:expenses:view'), async (req, res) => {
    try {
        const expensesResult = await db.query('SELECT id, name, vendor_id AS "vendorId", total_cost, bill_date AS "billDate", expense_head AS "expenseHead", expense_by AS "expenseBy", festival_id as "festivalId", has_multiple_payments as "hasMultiplePayments", created_at AS "createdAt", updated_at AS "updatedAt" FROM expenses WHERE deleted_at IS NULL ORDER BY bill_date DESC');
        const expenses = expensesResult.rows.map(e => ({ ...e, totalCost: parseFloat(e.total_cost) }));

        for (const expense of expenses) {
            const paymentsResult = await db.query(
                'SELECT id, amount, payment_date AS "paymentDate", payment_method AS "paymentMethod", notes, image_data as "image", expense_id as "expenseId", created_at as "createdAt", updated_at as "updatedAt" FROM expense_payments WHERE expense_id = $1 AND deleted_at IS NULL ORDER BY payment_date ASC',
                [expense.id]
            );
            expense.payments = paymentsResult.rows.map(p => ({ ...p, amount: parseFloat(p.amount) }));
            expense.amountPaid = expense.payments.reduce((sum, p) => sum + p.amount, 0);
            expense.outstandingAmount = expense.totalCost - expense.amountPaid;

            const imagesResult = await db.query('SELECT image_data FROM expense_images WHERE expense_id = $1', [expense.id]);
            expense.billReceipts = imagesResult.rows.map(row => row.image_data);
        }
        res.json(expenses);
    } catch (err) { 
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, vendorId, totalCost, billDate, expenseHead, billReceipts, expenseBy, festivalId, hasMultiplePayments, payments = [] } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const expenseRes = await client.query(
            'INSERT INTO expenses (name, vendor_id, total_cost, bill_date, expense_head, expense_by, festival_id, has_multiple_payments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, vendorId, totalCost, billDate, expenseHead, expenseBy, festivalId || null, hasMultiplePayments]
        );
        const newExpense = expenseRes.rows[0];
        
        const insertedPayments = [];
        if (payments && payments.length > 0) {
            for (const payment of payments) {
                const paymentRes = await client.query(
                    'INSERT INTO expense_payments (expense_id, amount, payment_date, payment_method, notes, image_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, amount, payment_date AS "paymentDate", payment_method AS "paymentMethod", notes, image_data as "image", expense_id as "expenseId", created_at as "createdAt", updated_at as "updatedAt"',
                    [newExpense.id, payment.amount, payment.paymentDate, payment.paymentMethod, payment.notes, payment.image]
                );
                insertedPayments.push(paymentRes.rows[0]);
            }
        }
        
        const insertedImages = [];
        if (billReceipts && billReceipts.length > 0) {
            for (const image of billReceipts) {
                await client.query('INSERT INTO expense_images (expense_id, image_data) VALUES ($1, $2)', [newExpense.id, image]);
                insertedImages.push(image);
            }
        }
        await client.query('COMMIT');
        
        const amountPaid = insertedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const outstandingAmount = parseFloat(newExpense.total_cost) - amountPaid;

        res.status(201).json({
            id: newExpense.id,
            name: newExpense.name,
            vendorId: newExpense.vendor_id,
            totalCost: parseFloat(newExpense.total_cost),
            billDate: newExpense.bill_date,
            expenseHead: newExpense.expense_head,
            expenseBy: newExpense.expense_by,
            festivalId: newExpense.festival_id,
            hasMultiplePayments: newExpense.has_multiple_payments,
            billReceipts: insertedImages,
            createdAt: newExpense.created_at,
            updatedAt: newExpense.updated_at,
            payments: insertedPayments.map(p => ({...p, amount: parseFloat(p.amount)})),
            amountPaid,
            outstandingAmount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating expense:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, vendorId, totalCost, billDate, expenseHead, billReceipts, expenseBy, festivalId, hasMultiplePayments, payments = [] } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM expenses WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Expense not found');

        const result = await client.query(
            'UPDATE expenses SET name=$1, vendor_id=$2, total_cost=$3, bill_date=$4, expense_head=$5, expense_by=$6, festival_id=$7, has_multiple_payments=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
            [name, vendorId, totalCost, billDate, expenseHead, expenseBy, festivalId || null, hasMultiplePayments, id]
        );
        
        await logChanges(client, {
            historyTable: 'expenses_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: { name, vendorId, totalCost, billDate, expenseHead, expenseBy, festivalId, hasMultiplePayments },
            fieldMapping: { name: 'name', vendorId: 'vendor_id', totalCost: 'total_cost', billDate: 'bill_date', expenseHead: 'expense_head', expenseBy: 'expense_by', festivalId: 'festival_id', hasMultiplePayments: 'has_multiple_payments' }
        });

        // Handle Payments (replace all strategy)
        await client.query('DELETE FROM expense_payments WHERE expense_id=$1', [id]);
        const insertedPayments = [];
        if (payments && payments.length > 0) {
            for (const payment of payments) {
                const paymentRes = await client.query(
                    'INSERT INTO expense_payments (expense_id, amount, payment_date, payment_method, notes, image_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, amount, payment_date AS "paymentDate", payment_method AS "paymentMethod", notes, image_data as "image", expense_id as "expenseId", created_at as "createdAt", updated_at as "updatedAt"',
                    [id, payment.amount, payment.paymentDate, payment.paymentMethod, payment.notes, payment.image]
                );
                insertedPayments.push(paymentRes.rows[0]);
            }
        }
        
        await client.query('DELETE FROM expense_images WHERE expense_id=$1', [id]);
        if (billReceipts && billReceipts.length > 0) {
            for (const image of billReceipts) {
                await client.query('INSERT INTO expense_images (expense_id, image_data) VALUES ($1, $2)', [id, image]);
            }
        }
        
        await client.query('COMMIT');
        
        const updatedExpense = result.rows[0];
        const amountPaid = insertedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const outstandingAmount = parseFloat(updatedExpense.total_cost) - amountPaid;

        res.json({
            id: updatedExpense.id, name: updatedExpense.name, vendorId: updatedExpense.vendor_id, 
            totalCost: parseFloat(updatedExpense.total_cost), billDate: updatedExpense.bill_date,
            expenseHead: updatedExpense.expense_head, billReceipts, expenseBy: updatedExpense.expense_by, festivalId: updatedExpense.festival_id,
            hasMultiplePayments: updatedExpense.has_multiple_payments,
            createdAt: updatedExpense.created_at, updatedAt: updatedExpense.updated_at,
            payments: insertedPayments.map(p => ({...p, amount: parseFloat(p.amount)})),
            amountPaid,
            outstandingAmount
        });
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error('Error updating expense:', err);
        res.status(500).json({ error: 'Failed to update expense' }); 
    }
    finally { client.release(); }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('expenses'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('expenses'));

module.exports = router;