import React from 'react';
import { CameraIcon } from '../icons/CameraIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { formatCurrency } from '../../utils/formatting';

interface PaymentSectionProps {
    totalCost: number;
    imagePreview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenCamera: () => void;
    onClearScreenshot: () => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
    totalCost,
    imagePreview,
    onFileChange,
    onOpenCamera,
    onClearScreenshot,
}) => {
    return (
        <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600">Total Payment Due</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalCost)}</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Payment Screenshot *</label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                    <label htmlFor="screenshotUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">Upload File</label>
                    <input id="screenshotUpload" type="file" accept="image/*" onChange={onFileChange} className="sr-only" />
                    <button type="button" onClick={onOpenCamera} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                        <CameraIcon className="w-5 h-5 mr-2" /> Capture
                    </button>
                </div>
                {imagePreview && (
                    <div className="mt-4">
                        <div className="relative w-fit">
                            <img src={imagePreview} alt="Payment preview" className="max-h-28 rounded-md border border-slate-200 p-1" />
                            <button type="button" onClick={onClearScreenshot} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
