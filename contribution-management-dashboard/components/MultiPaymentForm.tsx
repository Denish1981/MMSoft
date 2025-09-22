import React, { useState, useMemo, useEffect } from 'react';
import type { Payment, PaymentMethod } from '../types/index';
import { PlusIcon } from './icons/PlusIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { CameraIcon } from './icons/CameraIcon';
import { CloseIcon } from './icons/CloseIcon';
import CameraCapture from './CameraCapture';
import ImageViewerModal from './ImageViewerModal';
import { formatCurrency, formatUTCDate } from '../utils/formatting';

type NewPayment = Omit<Payment, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

interface MultiPaymentFormProps {
    totalCost: number;
    initialPayments: NewPayment[];
    onPaymentsChange: (payments: NewPayment[]) => void;
}

export const MultiPaymentForm: React.FC<MultiPaymentFormProps> = ({ totalCost, initialPayments, onPaymentsChange }) => {
    const [payments, setPayments] = useState<NewPayment[]>(initialPayments);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Online');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentImage, setPaymentImage] = useState<string | undefined>();
    const [paymentImagePreview, setPaymentImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [viewingPaymentImage, setViewingPaymentImage] = useState<string | null>(null);
    
    const amountPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const outstandingAmount = useMemo(() => totalCost - amountPaid, [totalCost, amountPaid]);

    useEffect(() => {
        onPaymentsChange(payments);
    }, [payments, onPaymentsChange]);

    const handleAddPayment = () => {
        if (!paymentAmount || !paymentDate || !paymentMethod) return;
        setPayments([...payments, {
            amount: parseFloat(paymentAmount),
            paymentDate,
            paymentMethod,
            notes: paymentNotes,
            image: paymentImage,
        }]);
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('Online');
        setPaymentNotes('');
        setPaymentImage(undefined);
        setPaymentImagePreview(null);
    };

    const handleRemovePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleCaptureComplete = (imageDataUrl: string) => {
        setPaymentImage(imageDataUrl);
        setPaymentImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            {viewingPaymentImage && <ImageViewerModal imageUrl={viewingPaymentImage} onClose={() => setViewingPaymentImage(null)} />}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Payments</h3>
                <div className="space-y-2">
                    {payments.map((p, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-md">
                            <div className="flex items-center gap-4">
                                {p.image && (<img src={p.image} alt="Payment proof" className="h-12 w-16 object-cover rounded-md cursor-pointer" onClick={() => setViewingPaymentImage(p.image!)} />)}
                                <div>
                                    <p className="font-semibold text-slate-800">{formatCurrency(p.amount)} <span className="text-xs font-normal text-slate-500">({p.paymentMethod})</span></p>
                                    <p className="text-xs text-slate-500">{formatUTCDate(p.paymentDate)} {p.notes && `- ${p.notes}`}</p>
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
                <div className="p-4 border border-slate-200 rounded-lg space-y-3">
                    <h4 className="font-medium text-slate-700">Add a New Payment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="number" placeholder="Amount (₹)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="input-style" />
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input-style" />
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="input-style bg-white"><option>Online</option><option>Cash</option><option>Cheque</option></select>
                    </div>
                    <input type="text" placeholder="Notes (optional)" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} className="w-full input-style" />
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Payment Image (Optional)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <label htmlFor="multiPaymentImageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                                Upload File
                                <input id="multiPaymentImageUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                            </label>
                            <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700"><CameraIcon className="w-5 h-5 mr-2" /> Capture Image</button>
                        </div>
                        {paymentImagePreview && (<div className="mt-2"><div className="relative w-fit"><img src={paymentImagePreview} alt="Payment preview" className="h-16 rounded-md border" /><button type="button" onClick={() => { setPaymentImage(undefined); setPaymentImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><CloseIcon className="w-3 h-3" /></button></div></div>)}
                    </div>
                    <div className="text-right"><button type="button" onClick={handleAddPayment} className="flex items-center text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-md"><PlusIcon className="w-4 h-4 mr-1"/> Add Payment</button></div>
                </div>
            </div>
        </>
    );
};
