import React, { useState, useEffect } from 'react';
import type { Payment, PaymentMethod } from '../types/index';
import { CameraIcon } from './icons/CameraIcon';
import { CloseIcon } from './icons/CloseIcon';
import CameraCapture from './CameraCapture';

type NewPayment = Omit<Payment, 'id' | 'expenseId' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

interface SinglePaymentFormProps {
    totalCost: number;
    initialPayment: NewPayment | undefined;
    onPaymentChange: (payment: NewPayment) => void;
}

export const SinglePaymentForm: React.FC<SinglePaymentFormProps> = ({ totalCost, initialPayment, onPaymentChange }) => {
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Online');
    const [notes, setNotes] = useState('');
    const [image, setImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    useEffect(() => {
        if (initialPayment) {
            setPaymentDate(new Date(initialPayment.paymentDate).toISOString().split('T')[0]);
            setPaymentMethod(initialPayment.paymentMethod);
            setNotes(initialPayment.notes || '');
            setImage(initialPayment.image);
            setImagePreview(initialPayment.image || null);
        }
    }, [initialPayment]);

    useEffect(() => {
        onPaymentChange({
            amount: totalCost,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            notes: notes,
            image: image,
        });
    }, [totalCost, paymentDate, paymentMethod, notes, image, onPaymentChange]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImage(base64String);
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setImage(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <div className="p-4 border-t border-slate-200 mt-4 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="singlePaymentDate" className="block text-sm font-medium text-slate-700">Payment Date</label>
                        <input type="date" id="singlePaymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full input-style" />
                    </div>
                    <div>
                        <label htmlFor="singlePaymentMethod" className="block text-sm font-medium text-slate-700">Payment Method</label>
                        <select id="singlePaymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full input-style bg-white"><option>Online</option><option>Cash</option><option>Cheque</option></select>
                    </div>
                </div>
                <div>
                    <label htmlFor="singlePaymentNotes" className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
                    <input type="text" id="singlePaymentNotes" placeholder="e.g., Final settlement" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full input-style" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Payment Receipt (Optional)</label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        <label htmlFor="singlePaymentImageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                            Upload File
                            <input id="singlePaymentImageUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                        </label>
                        <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700"><CameraIcon className="w-5 h-5 mr-2" /> Capture Image</button>
                    </div>
                    {imagePreview && (<div className="mt-2"><div className="relative w-fit"><img src={imagePreview} alt="Payment preview" className="h-16 rounded-md border" /><button type="button" onClick={() => { setImage(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><CloseIcon className="w-3 h-3" /></button></div></div>)}
                </div>
            </div>
        </>
    );
};
