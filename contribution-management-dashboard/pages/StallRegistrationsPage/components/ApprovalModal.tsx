import React from 'react';
// FIX: Changed import path for StallRegistration to resolve module export issue.
import type { StallRegistration } from '../../../types/participants';

interface ApprovalModalProps {
    registration: StallRegistration | null;
    isUpdating: boolean;
    onConfirm: (id: number) => void;
    onClose: () => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ registration, isUpdating, onConfirm, onClose }) => {
    if (!registration) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Confirm Approval</h2>
                <p className="text-slate-600 mb-8">Are you sure you want to approve this stall registration for <span className="font-semibold">{registration.registrantName}</span>?</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} disabled={isUpdating} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                    <button onClick={() => onConfirm(registration.id)} disabled={isUpdating} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">{isUpdating ? 'Approving...' : 'Yes, Approve'}</button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalModal;
