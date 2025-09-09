import React, { useState, useEffect } from 'react';
import type { Campaign } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface CampaignModalProps {
    campaignToEdit: Campaign | null;
    onClose: () => void;
    onSubmit: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({ campaignToEdit, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [description, setDescription] = useState('');

    const isEditing = !!campaignToEdit;

    useEffect(() => {
        if (campaignToEdit) {
            setName(campaignToEdit.name);
            setGoal(String(campaignToEdit.goal));
            setDescription(campaignToEdit.description);
        } else {
            setName('');
            setGoal('');
            setDescription('');
        }
    }, [campaignToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !goal || !description) {
            alert('Please fill out all required fields.');
            return;
        }
        onSubmit({
            name,
            goal: parseFloat(goal),
            description,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Campaign' : 'Add New Campaign'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Campaign Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full input-style" required />
                    </div>
                    <div>
                        <label htmlFor="goal" className="block text-sm font-medium text-slate-700">Goal Amount (₹)</label>
                        <input type="number" id="goal" value={goal} onChange={e => setGoal(e.target.value)} className="mt-1 block w-full input-style" required min="0" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full input-style" required />
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Campaign' : 'Add Campaign'}</button>
                    </div>
                </form>
                <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
            </div>
        </div>
    );
};
