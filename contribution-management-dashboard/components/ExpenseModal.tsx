
import React, { useState, useMemo, useEffect } from 'react';
import type { Expense, Vendor, Festival } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface ExpenseModalProps {
    vendors: Vendor[];
    expenses: Expense[];
    festivals: Festival[];
    expenseToEdit: Expense | null;
    onClose: () => void;
    onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ vendors, expenses, festivals, expenseToEdit, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [cost, setCost] = useState('');
    const [billDate, setBillDate] = useState('');
    const [expenseHead, setExpenseHead] = useState('');
    const [billReceipts, setBillReceipts] = useState<string[]>([]);
    const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
    const [expenseBy, setExpenseBy] = useState('');
    const [festivalId, setFestivalId] = useState<string | null>(null);

    useEffect(() => {
        if (expenseToEdit) {
            setName(expenseToEdit.name);
            setVendorId(String(expenseToEdit.vendorId));
            setCost(String(expenseToEdit.cost));
            setBillDate(new Date(expenseToEdit.billDate).toISOString().split('T')[0]);
            setExpenseHead(expenseToEdit.expenseHead);
            setBillReceipts(expenseToEdit.billReceipts || []);
            setReceiptPreviews(expenseToEdit.billReceipts || []);
            setExpenseBy(expenseToEdit.expenseBy);
            setFestivalId(expenseToEdit.festivalId ? String(expenseToEdit.festivalId) : null);
        }
    }, [expenseToEdit]);

    const existingExpenseHeads = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseHead))), [expenses]);
    const existingExpenseBy = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseBy))), [expenses]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const fileArray = Array.from(files);
            const filePromises = fileArray.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(filePromises)
                .then(base64Strings => {
                    setBillReceipts((prev: string[]) => [...prev, ...base64Strings]);
                    setReceiptPreviews((prev: string[]) => [...prev, ...base64Strings]);
                })
                .catch(error => console.error("Error reading files:", error));
        }
    };

    const removeImage = (index: number) => {
        setBillReceipts((prev: string[]) => prev.filter((_, i) => i !== index));
        setReceiptPreviews((prev: string[]) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !vendorId || !cost || !billDate || !expenseHead || !expenseBy) {
            alert('Please fill out all required fields.');
            return;
        }
        onSubmit({
            name,
            vendorId: Number(vendorId),
            cost: parseFloat(cost),
            billDate: billDate,
            expenseHead,
            billReceipts,
            expenseBy,
            festivalId: festivalId ? Number(festivalId) : null,
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="vendor" className="block text-sm font-medium text-slate-700">Name of Vendor</label>
                            <select id="vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                                <option value="" disabled>Select a vendor</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="festivalId" className="block text-sm font-medium text-slate-700">Associated Festival (Optional)</label>
                            <select id="festivalId" value={festivalId || ''} onChange={e => setFestivalId(e.target.value || null)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                <option value="">None</option>
                                {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
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
                        <label htmlFor="billReceipts" className="block text-sm font-medium text-slate-700">Bill Receipts</label>
                        <input 
                            type="file" 
                            id="billReceipts" 
                            accept="image/*" 
                            multiple
                            onChange={handleFileChange} 
                            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                        />
                    </div>

                    {receiptPreviews.length > 0 && (
                        <div className="mt-2">
                             <p className="text-sm font-medium text-slate-600 mb-2">Receipt Previews:</p>
                             <div className="grid grid-cols-3 gap-2">
                                {receiptPreviews.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-md border border-slate-200 p-1" />
                                        <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                            <CloseIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                             </div>
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
