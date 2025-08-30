
import React, { useState, useEffect } from 'react';
import type { Festival, Campaign } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface FestivalModalProps {
    festivalToEdit: Festival | null;
    campaigns: Campaign[];
    onClose: () => void;
    onSubmit: (festival: Omit<Festival, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const FestivalModal: React.FC<FestivalModalProps> = ({ festivalToEdit, campaigns, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [campaignId, setCampaignId] = useState<string | null>(null);

    useEffect(() => {
        if (festivalToEdit) {
            setName(festivalToEdit.name);
            setDescription(festivalToEdit.description || '');
            setStartDate(new Date(festivalToEdit.startDate).toISOString().split('T')[0]);
            setEndDate(new Date(festivalToEdit.endDate).toISOString().split('T')[0]);
            setCampaignId(festivalToEdit.campaignId ? String(festivalToEdit.campaignId) : null);
        } else if (campaigns.length > 0) {
            setCampaignId(String(campaigns[0].id));
        }
    }, [festivalToEdit, campaigns]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !startDate || !endDate || !campaignId) {
            alert('Please fill out all required fields.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            alert('End date cannot be before the start date.');
            return;
        }
        onSubmit({
            name,
            description,
            startDate: startDate,
            endDate: endDate,
            campaignId: campaignId ? Number(campaignId) : null,
        });
    };

    const isEditing = !!festivalToEdit;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Festival' : 'Add New Festival'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Festival Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label htmlFor="campaignId" className="block text-sm font-medium text-slate-700">Associated Campaign</label>
                        <select id="campaignId" value={campaignId || ''} onChange={e => setCampaignId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                            <option value="" disabled>Select a campaign</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">Start Date</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">End Date</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description (Optional)</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    
                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Festival' : 'Add Festival'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
