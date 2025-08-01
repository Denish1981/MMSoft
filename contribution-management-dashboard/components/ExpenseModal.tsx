import React, { useState, useMemo, useEffect } from 'react';
import type { Expense, Vendor } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface ExpenseModalProps {
    vendors: Vendor[];
    expenses: Expense[];
    expenseToEdit: Expense | null;
    onClose: () => void;
    onSubmit: (expense: Omit<Expense, 'id'>) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ vendors, expenses, expenseToEdit, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [cost, setCost] = useState('');
    const [billDate, setBillDate] = useState('');
    const [expenseHead, setExpenseHead] = useState('');
    const [billReceipt, setBillReceipt] = useState<string | undefined>();
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [expenseBy, setExpenseBy] = useState('');

    useEffect(() => {
        if (expenseToEdit) {
            setName(expenseToEdit.name);
            setVendorId(expenseToEdit.vendorId);
            setCost(String(expenseToEdit.cost));
            setBillDate(new Date(expenseToEdit.billDate).toISOString().split('T')[0]);
            setExpenseHead(expenseToEdit.expenseHead);
            setBillReceipt(expenseToEdit.billReceipt);
            setReceiptPreview(expenseToEdit.billReceipt || null);
            setExpenseBy(expenseToEdit.expenseBy);
        }
    }, [expenseToEdit]);

    const existingExpenseHeads = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseHead))), [expenses]);
    const existingExpenseBy = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseBy))), [expenses]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setBillReceipt(base64String);
                setReceiptPreview(base64String);
            };
            reader.readAsDataURL(file);
        } else {
            setBillReceipt(undefined);
            setReceiptPreview(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !vendorId || !cost || !billDate || !expenseHead || !expenseBy) {
            alert('Please fill out all required fields.');
            return;
        }
        onSubmit({
            name,
            vendorId,
            cost: parseFloat(cost),
            billDate: new Date(billDate).toISOString(),
            expenseHead,
            billReceipt,
            expenseBy,
        });
    };
    
    const isEditing = !!expenseToEdit;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Expense' : 'Add New Expense'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="expenseName" className="block text-sm font-medium text-slate-700">Name of Expense</label>
                        <input type="text" id="expenseName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label htmlFor="vendor" className="block text-sm font-medium text-slate-700">Name of Vendor</label>
                        <select id="vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                            <option value="" disabled>Select a vendor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="cost" className="block text-sm font-medium text-slate-700">Cost (₹)</label>
                            <input type="number" id="cost" value={cost} onChange={e => setCost(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required min="0" />
                        </div>
                        <div>
                            <label htmlFor="billDate" className="block text-sm font-medium text-slate-700">Bill Date</label>
                            <input type="date" id="billDate" value={billDate} onChange={e => setBillDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="expenseHead" className="block text-sm font-medium text-slate-700">Expense Head</label>
                        <input list="expense-heads" id="expenseHead" value={expenseHead} onChange={e => setExpenseHead(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        <datalist id="expense-heads">
                            {existingExpenseHeads.map(head => <option key={head} value={head} />)}
                        </datalist>
                    </div>
                    <div>
                        <label htmlFor="expenseBy" className="block text-sm font-medium text-slate-700">Expense Done By</label>
                        <input list="expense-by-list" id="expenseBy" value={expenseBy} onChange={e => setExpenseBy(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                         <datalist id="expense-by-list">
                            {existingExpenseBy.map(person => <option key={person} value={person} />)}
                        </datalist>
                    </div>
                     <div>
                        <label htmlFor="billReceipt" className="block text-sm font-medium text-slate-700">Bill Receipt</label>
                        <input 
                            type="file" 
                            id="billReceipt" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                        />
                    </div>

                    {receiptPreview && (
                        <div className="mt-2">
                            <p className="text-sm font-medium text-slate-600 mb-2">Receipt Preview:</p>
                            <img src={receiptPreview} alt="Receipt preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                        </div>
                    )}
                    <div className="flex justify-end pt-4 space-x-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Expense' : 'Add Expense'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
