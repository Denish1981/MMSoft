import React, { useState } from 'react';
// FIX: Changed import path for StallRegistration to resolve module export issue.
import type { StallRegistration } from '../../../types/participants';

interface RejectionModalProps {
    registration: StallRegistration | null;
    isUpdating: boolean;
    onConfirm: (id: number, reason: string) => void;
    onClose: () => void;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ registration, isUpdating, onConfirm, onClose }) => {
    const [rejectionReason, setRejectionReason] = useState('');

    if (!registration) return null;

    const handleSubmit = () => {
        if (rejectionReason.trim()) {
            onConfirm(registration.id, rejectionReason.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Reject Registration</h2>
                <p className="text-slate-600 mb-4">Please provide a reason for rejecting the registration from <span className="font-semibold">{registration.registrantName}</span>.</p>
                <div>
                    <label htmlFor="rejectionReason" className="block text-sm font-medium text-slate-700">Rejection Reason</label>
                    <textarea id="rejectionReason" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} required rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} disabled={isUpdating} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                    <button onClick={handleSubmit} disabled={isUpdating || !rejectionReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:bg-slate-400">{isUpdating ? 'Rejecting...' : 'Confirm Rejection'}</button>
                </div>
            </div>
        </div>
    );
};

export default RejectionModal;
