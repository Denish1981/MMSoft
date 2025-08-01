import React from 'react';

interface ConfirmationModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm, onCancel, message }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Confirm Action</h2>
                <p className="text-slate-600 mb-8">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
