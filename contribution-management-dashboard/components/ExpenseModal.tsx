import React, { useState, useEffect, useCallback } from 'react';
import type { Expense, Vendor, Festival, Payment } from '../types/index';
import { CloseIcon } from './icons/CloseIcon';
import { CameraIcon } from './icons/CameraIcon';
import CameraCapture from './CameraCapture';
import { SinglePaymentForm } from './SinglePaymentForm';
import { MultiPaymentForm } from './MultiPaymentForm';

interface ExpenseModalProps {
    vendors: Vendor[];
    festivals: Festival[];
    expenseToEdit: Expense | null;
    onClose: () => void;
    onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'outstandingAmount'>) => void;
}

type NewPayment = Omit<Payment, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ vendors, festivals, expenseToEdit, onClose, onSubmit }) => {
    // Shared Expense Fields
    const [name, setName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [totalCost, setTotalCost] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseHead, setExpenseHead] = useState('');
    const [billReceipts, setBillReceipts] = useState<string[]>([]);
    const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
    const [expenseBy, setExpenseBy] = useState('');
    const [festivalId, setFestivalId] = useState<string | null>(null);

    // Payment State
    const [hasMultiplePayments, setHasMultiplePayments] = useState(false);
    const [payments, setPayments] = useState<NewPayment[]>([]);
    const [initialPayments, setInitialPayments] = useState<NewPayment[]>([]);

    // Modals
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        if (expenseToEdit) {
            setName(expenseToEdit.name);
            setVendorId(String(expenseToEdit.vendorId));
            setTotalCost(String(expenseToEdit.totalCost));
            setBillDate(new Date(expenseToEdit.billDate).toISOString().split('T')[0]);
            setExpenseHead(expenseToEdit.expenseHead);
            setBillReceipts(expenseToEdit.billReceipts || []);
            setReceiptPreviews(expenseToEdit.billReceipts || []);
            setExpenseBy(expenseToEdit.expenseBy);
            setFestivalId(expenseToEdit.festivalId ? String(expenseToEdit.festivalId) : null);
            
            const isMulti = String(expenseToEdit.hasMultiplePayments) === 'true';
            setHasMultiplePayments(isMulti);
            setInitialPayments(expenseToEdit.payments || []);
        } else {
            // Reset entire form for new entry
            setName(''); setVendorId(''); setTotalCost('');
            setBillDate(new Date().toISOString().split('T')[0]);
            setExpenseHead(''); setBillReceipts([]); setReceiptPreviews([]);
            setExpenseBy(''); setFestivalId(null); setHasMultiplePayments(false);
            setInitialPayments([]);
        }
    }, [expenseToEdit]);

    const handleBillReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setBillReceipts(prev => [...prev, base64String]);
                setReceiptPreviews(prev => [...prev, base64String]);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleBillReceiptCaptureComplete = (imageDataUrl: string) => {
        setBillReceipts(prev => [...prev, imageDataUrl]);
        setReceiptPreviews(prev => [...prev, imageDataUrl]);
        setIsCameraOpen(false);
    };

    const removeBillReceiptImage = (index: number) => {
        setBillReceipts(prev => prev.filter((_, i) => i !== index));
        setReceiptPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSinglePaymentChange = useCallback((payment: NewPayment) => {
        setPayments([payment]);
    }, []);

    const handleMultiPaymentsChange = useCallback((newPayments: NewPayment[]) => {
        setPayments(newPayments);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !vendorId || !totalCost || !billDate || !expenseHead || !expenseBy) {
            alert('Please fill out all required fields.');
            return;
        }

        onSubmit({
            name,
            vendorId: Number(vendorId),
            totalCost: parseFloat(totalCost),
            billDate,
            expenseHead,
            billReceipts,
            expenseBy,
            festivalId: festivalId ? Number(festivalId) : null,
            hasMultiplePayments,
            payments,
        });
    };
    
    const isEditing = !!expenseToEdit;

    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleBillReceiptCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl m-4 overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Expense' : 'Add New Expense'}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Expense Details */}
                        <div>
                            <label htmlFor="expenseName" className="block text-sm font-medium text-slate-700">Name of Expense</label>
                            <input type="text" id="expenseName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full input-style" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="totalCost" className="block text-sm font-medium text-slate-700">Total Cost (₹)</label>
                                <input type="number" id="totalCost" value={totalCost} onChange={e => setTotalCost(e.target.value)} className="mt-1 block w-full input-style" required min="0" />
                            </div>
                            <div>
                                <label htmlFor="vendor" className="block text-sm font-medium text-slate-700">Vendor</label>
                                <select id="vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className="mt-1 block w-full input-style bg-white" required>
                                    <option value="" disabled>Select a vendor</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="billDate" className="block text-sm font-medium text-slate-700">Bill Date</label>
                                <input type="date" id="billDate" value={billDate} onChange={e => setBillDate(e.target.value)} className="mt-1 block w-full input-style" required />
                            </div>
                            <div>
                                <label htmlFor="expenseHead" className="block text-sm font-medium text-slate-700">Expense Head</label>
                                <input type="text" id="expenseHead" value={expenseHead} onChange={e => setExpenseHead(e.target.value)} className="mt-1 block w-full input-style" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="expenseBy" className="block text-sm font-medium text-slate-700">Expense Done By</label>
                                <input type="text" id="expenseBy" value={expenseBy} onChange={e => setExpenseBy(e.target.value)} className="mt-1 block w-full input-style" required />
                            </div>
                            <div>
                                <label htmlFor="festivalId" className="block text-sm font-medium text-slate-700">Festival (Optional)</label>
                                <select id="festivalId" value={festivalId || ''} onChange={e => setFestivalId(e.target.value || null)} className="mt-1 block w-full input-style bg-white">
                                    <option value="">None</option>
                                    {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {/* Bill Receipts */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Bill Receipts</label>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <label htmlFor="billReceiptUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                                    Upload File(s)
                                    <input id="billReceiptUpload" type="file" accept="image/*" onChange={handleBillReceiptFileChange} className="sr-only" />
                                </label>
                                <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                                    <CameraIcon className="w-5 h-5 mr-2" /> Capture Image
                                </button>
                            </div>
                        </div>
                        {receiptPreviews.length > 0 && <div className="mt-2"><div className="grid grid-cols-3 gap-2">{receiptPreviews.map((preview, index) => (<div key={index} className="relative"><img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-md border" /><button type="button" onClick={() => removeBillReceiptImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><CloseIcon className="w-3 h-3" /></button></div>))}</div></div>}

                        {/* Payments Section */}
                        <div className="pt-4 mt-4 border-t border-slate-200">
                             <div className="flex items-center">
                                <input type="checkbox" id="hasMultiplePayments" checked={hasMultiplePayments} onChange={e => setHasMultiplePayments(e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                                <label htmlFor="hasMultiplePayments" className="ml-2 block text-sm font-medium text-slate-700">This expense involves multiple payments</label>
                            </div>
                        </div>

                        {hasMultiplePayments ? (
                            <MultiPaymentForm 
                                totalCost={parseFloat(totalCost || '0')}
                                initialPayments={initialPayments}
                                onPaymentsChange={handleMultiPaymentsChange}
                            />
                        ) : (
                            <SinglePaymentForm 
                                totalCost={parseFloat(totalCost || '0')}
                                initialPayment={initialPayments[0]}
                                onPaymentChange={handleSinglePaymentChange}
                            />
                        )}
                        
                        <div className="flex justify-end pt-4 space-x-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Expense' : 'Add Expense'}</button>
                        </div>
                    </form>
                    <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
                </div>
            </div>
        </>
    );
};
