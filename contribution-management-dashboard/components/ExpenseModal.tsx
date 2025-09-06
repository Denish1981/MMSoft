import React, { useState, useMemo, useEffect } from 'react';
import type { Expense, Vendor, Festival, Payment, PaymentMethod } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { PlusIcon } from './icons/PlusIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';
import { CameraIcon } from './icons/CameraIcon';
import CameraCapture from './CameraCapture';

interface ExpenseModalProps {
    vendors: Vendor[];
    festivals: Festival[];
    expenseToEdit: Expense | null;
    onClose: () => void;
    onSubmit: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'outstandingAmount'>) => void;
}

type NewPayment = Omit<Payment, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

const ImageViewerModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100]" onClick={onClose}>
        <div className="p-4 bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt="Full size payment receipt" className="max-w-full max-h-[85vh] object-contain" />
             <button onClick={onClose} className="absolute -top-4 -right-4 text-white bg-slate-800 rounded-full p-2">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
    </div>
);

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ vendors, festivals, expenseToEdit, onClose, onSubmit }) => {
    // Expense Fields
    const [name, setName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [totalCost, setTotalCost] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseHead, setExpenseHead] = useState('');
    const [billReceipts, setBillReceipts] = useState<string[]>([]);
    const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
    const [expenseBy, setExpenseBy] = useState('');
    const [festivalId, setFestivalId] = useState<string | null>(null);

    // Payments
    const [payments, setPayments] = useState<NewPayment[]>([]);
    
    // Payment Sub-form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Online');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentDoneBy, setPaymentDoneBy] = useState('');
    const [paymentImage, setPaymentImage] = useState<string | undefined>();
    const [paymentImagePreview, setPaymentImagePreview] = useState<string | null>(null);

    // Modals
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [viewingPaymentImage, setViewingPaymentImage] = useState<string | null>(null);

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
            setPayments(expenseToEdit.payments || []);
        } else {
            // Reset form
            setName('');
            setVendorId('');
            setTotalCost('');
            setBillDate(new Date().toISOString().split('T')[0]);
            setExpenseHead('');
            setBillReceipts([]);
            setReceiptPreviews([]);
            setExpenseBy('');
            setFestivalId(null);
            setPayments([]);
        }
    }, [expenseToEdit]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const filePromises = Array.from(files).map(file => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }));
            Promise.all(filePromises).then(base64s => {
                setBillReceipts(prev => [...prev, ...base64s]);
                setReceiptPreviews(prev => [...prev, ...base64s]);
            });
        }
    };

    const removeImage = (index: number) => {
        setBillReceipts(prev => prev.filter((_, i) => i !== index));
        setReceiptPreviews(prev => prev.filter((_, i) => i !== index));
    };
    
    const handlePaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPaymentImage(base64String);
                setPaymentImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaymentCaptureComplete = (imageDataUrl: string) => {
        setPaymentImage(imageDataUrl);
        setPaymentImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };


    const handleAddPayment = () => {
        if (!paymentAmount || !paymentDate || !paymentMethod || !paymentDoneBy) {
            alert('Amount, date, method, and who made the payment are required.');
            return;
        }
        setPayments([...payments, {
            amount: parseFloat(paymentAmount),
            paymentDate,
            paymentMethod,
            notes: paymentNotes,
            paymentDoneBy,
            image: paymentImage,
        }]);
        // Reset form
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('Online');
        setPaymentNotes('');
        setPaymentDoneBy('');
        setPaymentImage(undefined);
        setPaymentImagePreview(null);
    };

    const handleRemovePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

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
            payments,
        });
    };
    
    const isEditing = !!expenseToEdit;
    const amountPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const outstandingAmount = useMemo(() => parseFloat(totalCost || '0') - amountPaid, [totalCost, amountPaid]);


    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handlePaymentCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            {viewingPaymentImage && <ImageViewerModal imageUrl={viewingPaymentImage} onClose={() => setViewingPaymentImage(null)} />}
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
                            <label htmlFor="billReceipts" className="block text-sm font-medium text-slate-700">Bill Receipts</label>
                            <input type="file" id="billReceipts" accept="image/*" multiple onChange={handleFileChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        {receiptPreviews.length > 0 && <div className="mt-2"><div className="grid grid-cols-3 gap-2">{receiptPreviews.map((preview, index) => (<div key={index} className="relative"><img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-md border" /><button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><CloseIcon className="w-3 h-3" /></button></div>))}</div></div>}

                        {/* Payments Section */}
                        <div className="pt-4 mt-4 border-t border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Payments</h3>
                            <div className="space-y-4">
                                {/* Payment List */}
                                <div className="space-y-2">
                                    {payments.map((p, index) => (
                                        <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-md">
                                            <div className="flex items-center gap-4">
                                                {p.image && (
                                                    <img 
                                                        src={p.image} 
                                                        alt="Payment proof" 
                                                        className="h-12 w-16 object-cover rounded-md cursor-pointer"
                                                        onClick={() => setViewingPaymentImage(p.image!)}
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-semibold text-slate-800">{formatCurrency(p.amount)} <span className="text-xs font-normal text-slate-500">({p.paymentMethod})</span></p>
                                                    <p className="text-xs text-slate-500">
                                                        {formatUTCDate(p.paymentDate)}
                                                        {p.paymentDoneBy && ` • Paid by: ${p.paymentDoneBy}`}
                                                        {p.notes && ` • Notes: ${p.notes}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => handleRemovePayment(index)} className="text-red-500 hover:text-red-700"><DeleteIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {payments.length === 0 && <p className="text-sm text-center text-slate-500 py-4">No payments added yet.</p>}
                                </div>
                                <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg font-semibold">
                                    <span className="text-green-600">Total Paid: {formatCurrency(amountPaid)}</span>
                                    <span className={outstandingAmount > 0 ? 'text-red-600' : 'text-slate-600'}>Outstanding: {formatCurrency(outstandingAmount)}</span>
                                </div>
                                
                                {/* Add Payment Form */}
                                <div className="p-4 border border-slate-200 rounded-lg space-y-3">
                                    <h4 className="font-medium text-slate-700">Add a New Payment</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input type="number" placeholder="Amount (₹)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="input-style" />
                                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input-style" />
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="input-style bg-white">
                                            <option>Online</option><option>Cash</option><option>Cheque</option>
                                        </select>
                                    </div>
                                    <div>
                                        <input type="text" placeholder="Payment Done By" value={paymentDoneBy} onChange={e => setPaymentDoneBy(e.target.value)} className="w-full input-style" />
                                    </div>
                                    <input type="text" placeholder="Notes (optional)" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} className="w-full input-style" />
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Payment Image (Optional)</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <label htmlFor="paymentImageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                                                Upload File
                                                <input id="paymentImageUpload" type="file" accept="image/*" onChange={handlePaymentFileChange} className="sr-only" />
                                            </label>
                                            <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                                                <CameraIcon className="w-5 h-5 mr-2" />
                                                Capture Image
                                            </button>
                                        </div>
                                        {paymentImagePreview && (
                                            <div className="mt-2"><div className="relative w-fit">
                                                <img src={paymentImagePreview} alt="Payment preview" className="h-16 rounded-md border" />
                                                <button type="button" onClick={() => { setPaymentImage(undefined); setPaymentImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><CloseIcon className="w-3 h-3" /></button>
                                            </div></div>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <button type="button" onClick={handleAddPayment} className="flex items-center text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-md">
                                            <PlusIcon className="w-4 h-4 mr-1"/> Add Payment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
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