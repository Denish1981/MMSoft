import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { CopyIcon } from './icons/CopyIcon';

interface ThankYouModalProps {
    note: string;
    onClose: () => void;
}

export const ThankYouModal: React.FC<ThankYouModalProps> = ({ note, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(note);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Generated Thank You Note</h2>
                <div className="bg-slate-50 p-4 rounded-md text-slate-700 whitespace-pre-wrap min-h-[150px]">
                    {note}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleCopy} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                        <CopyIcon className="w-5 h-5 mr-2" />
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};
