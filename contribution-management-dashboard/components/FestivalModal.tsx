
import React, { useState, useEffect } from 'react';
import type { Festival, Campaign } from '../types/index';
import { CloseIcon } from './icons/CloseIcon';

interface FestivalModalProps {
    festivalToEdit: Festival | null;
    campaigns: Campaign[];
    onClose: () => void;
    onSubmit: (festival: Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => void;
}

export const FestivalModal: React.FC<FestivalModalProps> = ({ festivalToEdit, campaigns, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [campaignId, setCampaignId] = useState<number | null>(null);
    const [stallPricePerTablePerDay, setStallPricePerTablePerDay] = useState('');
    const [stallElectricityCostPerDay, setStallElectricityCostPerDay] = useState('');
    const [stallStartDate, setStallStartDate] = useState('');
    const [stallEndDate, setStallEndDate] = useState('');
    const [maxStalls, setMaxStalls] = useState('');

    const isEditing = !!festivalToEdit;

    useEffect(() => {
        if (festivalToEdit) {
            setName(festivalToEdit.name);
            setDescription(festivalToEdit.description || '');
            setStartDate(new Date(festivalToEdit.startDate).toISOString().split('T')[0]);
            setEndDate(new Date(festivalToEdit.endDate).toISOString().split('T')[0]);
            setCampaignId(festivalToEdit.campaignId);
            setStallPricePerTablePerDay(String(festivalToEdit.stallPricePerTablePerDay || ''));
            setStallElectricityCostPerDay(String(festivalToEdit.stallElectricityCostPerDay || ''));
            setStallStartDate(festivalToEdit.stallStartDate ? new Date(festivalToEdit.stallStartDate).toISOString().split('T')[0] : '');
            setStallEndDate(festivalToEdit.stallEndDate ? new Date(festivalToEdit.stallEndDate).toISOString().split('T')[0] : '');
            setMaxStalls(String(festivalToEdit.maxStalls || ''));
        } else {
            // Reset form
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setCampaignId(campaigns[0]?.id || null);
            setStallPricePerTablePerDay('');
            setStallElectricityCostPerDay('');
            setStallStartDate('');
            setStallEndDate('');
            setMaxStalls('');
        }
    }, [festivalToEdit, campaigns]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !startDate || !endDate || !campaignId) {
            alert('Please fill out all required fields: Name, Dates, and Campaign.');
            return;
        }
        onSubmit({
            name,
            description,
            startDate,
            endDate,
            campaignId,
            stallPricePerTablePerDay: stallPricePerTablePerDay ? parseFloat(stallPricePerTablePerDay) : null,
            stallElectricityCostPerDay: stallElectricityCostPerDay ? parseFloat(stallElectricityCostPerDay) : null,
            stallStartDate: stallStartDate || null,
            stallEndDate: stallEndDate || null,
            maxStalls: maxStalls ? parseInt(maxStalls, 10) : null,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl m-4 overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Festival' : 'Add New Festival'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Festival Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full input-style" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">Start Date</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full input-style" required />
                        </div>
                        <div>
                           <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">End Date</label>
                           <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full input-style" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="campaignId" className="block text-sm font-medium text-slate-700">Associated Campaign</label>
                        <select id="campaignId" value={campaignId || ''} onChange={e => setCampaignId(Number(e.target.value))} className="mt-1 block w-full input-style bg-white" required>
                            <option value="" disabled>Select a campaign</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description (Optional)</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full input-style" />
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Stall Settings (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="maxStalls" className="block text-sm font-medium text-slate-700">Max Stalls per Day</label>
                                <input type="number" id="maxStalls" value={maxStalls} placeholder="No limit" onChange={e => setMaxStalls(e.target.value)} className="mt-1 block w-full input-style" min="0" />
                            </div>
                            <div>
                                <label htmlFor="stallPricePerTablePerDay" className="block text-sm font-medium text-slate-700">Stall Price (per table/day)</label>
                                <input type="number" id="stallPricePerTablePerDay" value={stallPricePerTablePerDay} className="mt-1 block w-full input-style" min="0" />
                            </div>
                            <div>
                                <label htmlFor="stallElectricityCostPerDay" className="block text-sm font-medium text-slate-700">Electricity Cost (per day)</label>
                                <input type="number" id="stallElectricityCostPerDay" value={stallElectricityCostPerDay} className="mt-1 block w-full input-style" min="0" />
                            </div>
                            <div>
                                <label htmlFor="stallStartDate" className="block text-sm font-medium text-slate-700">Stall Registration Start Date</label>
                                <input type="date" id="stallStartDate" value={stallStartDate} onChange={e => setStallStartDate(e.target.value)} className="mt-1 block w-full input-style" />
                            </div>
                            <div>
                               <label htmlFor="stallEndDate" className="block text-sm font-medium text-slate-700">Stall Registration End Date</label>
                               <input type="date" id="stallEndDate" value={stallEndDate} onChange={e => setStallEndDate(e.target.value)} className="mt-1 block w-full input-style" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Festival' : 'Add Festival'}</button>
                    </div>
                </form>
                <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
            </div>
        </div>
    );
};
