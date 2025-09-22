

import React, { useState, useEffect } from 'react';
import type { Budget, Festival } from '../types/index';
import { CloseIcon } from './icons/CloseIcon';

interface BudgetModalProps {
    budgetToEdit: Budget | null;
    expenseHeads: string[];
    festivals: Festival[];
    onClose: () => void;
    onSubmit: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ budgetToEdit, expenseHeads, festivals, onClose, onSubmit }) => {
    const [itemName, setItemName] = useState('');
    const [budgetedAmount, setBudgetedAmount] = useState('');
    const [expenseHead, setExpenseHead] = useState('');
    const [festivalId, setFestivalId] = useState<string | null>(null);

    useEffect(() => {
        if (budgetToEdit) {
            setItemName(budgetToEdit.itemName);
            setBudgetedAmount(String(budgetToEdit.budgetedAmount));
            setExpenseHead(budgetToEdit.expenseHead);
            setFestivalId(budgetToEdit.festivalId ? String(budgetToEdit.festivalId) : null);
        }
    }, [budgetToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !budgetedAmount || !expenseHead) {
            alert('Please fill out all required fields.');
            return;
        }
        onSubmit({
            itemName,
            budgetedAmount: parseFloat(budgetedAmount),
            expenseHead,
            festivalId: festivalId ? Number(festivalId) : null,
        });
    };

    const isEditing = !!budgetToEdit;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Budget Item' : 'Add New Budget Item'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="itemName" className="block text-sm font-medium text-slate-700">Item Name</label>
                        <input type="text" id="itemName" value={itemName} onChange={e => setItemName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="expenseHead" className="block text-sm font-medium text-slate-700">Expense Head</label>
                            <input list="expense-heads" id="expenseHead" value={expenseHead} onChange={e => setExpenseHead(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            <datalist id="expense-heads">
                                {expenseHeads.map(head => <option key={head} value={head} />)}
                            </datalist>
                        </div>
                        <div>
                            <label htmlFor="festivalId" className="block text-sm font-medium text-slate-700">Associated Festival (Optional)</label>
                            <select id="festivalId" value={festivalId || ''} onChange={e => setFestivalId(e.target.value || null)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                <option value="">None</option>
                                {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="budgetedAmount" className="block text-sm font-medium text-slate-700">Budgeted Amount (₹)</label>
                        <input type="number" id="budgetedAmount" value={budgetedAmount} onChange={e => setBudgetedAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required min="0" />
                    </div>
                    
                    <div className="flex justify-end pt-4 space-x-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Budget' : 'Add Budget'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
