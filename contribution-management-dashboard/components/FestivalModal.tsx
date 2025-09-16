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

    // Stall Registration State
    const [stallRegistrationOpen, setStallRegistrationOpen] = useState(false);
    const [stallStartDate, setStallStartDate] = useState('');
    const [stallEndDate, setStallEndDate] = useState('');
    const [stallPricePerTablePerDay, setStallPricePerTablePerDay] = useState('');
    const [stallElectricityCostPerDay, setStallElectricityCostPerDay] = useState('');


    useEffect(() => {
        if (festivalToEdit) {
            setName(festivalToEdit.name);
            setDescription(festivalToEdit.description || '');
            setStartDate(new Date(festivalToEdit.startDate).toISOString().split('T')[0]);
            setEndDate(new Date(festivalToEdit.endDate).toISOString().split('T')[0]);
            setCampaignId(festivalToEdit.campaignId ? String(festivalToEdit.campaignId) : null);
            setStallRegistrationOpen(festivalToEdit.stallRegistrationOpen || false);
            setStallStartDate(festivalToEdit.stallStartDate ? new Date(festivalToEdit.stallStartDate).toISOString().split('T')[0] : '');
            setStallEndDate(festivalToEdit.stallEndDate ? new Date(festivalToEdit.stallEndDate).toISOString().split('T')[0] : '');
            setStallPricePerTablePerDay(String(festivalToEdit.stallPricePerTablePerDay || ''));
            setStallElectricityCostPerDay(String(festivalToEdit.stallElectricityCostPerDay || ''));

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
        if (stallRegistrationOpen && (!stallStartDate || !stallEndDate || stallPricePerTablePerDay === '' || stallElectricityCostPerDay === '')) {
            alert('Please fill out all stall registration fields if it is enabled.');
            return;
        }
        onSubmit({
            name,
            description,
            startDate: startDate,
            endDate: endDate,
            campaignId: campaignId ? Number(campaignId) : null,
            stallRegistrationOpen,
            stallStartDate: stallRegistrationOpen ? stallStartDate : undefined,
            stallEndDate: stallRegistrationOpen ? stallEndDate : undefined,
            stallPricePerTablePerDay: stallRegistrationOpen ? Number(stallPricePerTablePerDay) : undefined,
            stallElectricityCostPerDay: stallRegistrationOpen ? Number(stallElectricityCostPerDay) : undefined,
        });
    };

    const isEditing = !!festivalToEdit;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Festival' : 'Add New Festival'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Festival Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full input-style" required />
                    </div>
                    <div>
                        <label htmlFor="campaignId" className="block text-sm font-medium text-slate-700">Associated Campaign</label>
                        <select id="campaignId" value={campaignId || ''} onChange={e => setCampaignId(e.target.value)} className="mt-1 block w-full input-style bg-white" required>
                            <option value="" disabled>Select a campaign</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
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
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description (Optional)</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full input-style" />
                    </div>

                    {/* Stall Registration Settings */}
                    <div className="pt-4 mt-4 border-t border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800">Stall Registration Settings</h3>
                         <div className="flex items-center mt-4">
                            <input type="checkbox" id="stallRegistrationOpen" checked={stallRegistrationOpen} onChange={e => setStallRegistrationOpen(e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                            <label htmlFor="stallRegistrationOpen" className="ml-2 block text-sm font-medium text-slate-700">Enable Stall Registration</label>
                        </div>

                        {stallRegistrationOpen && (
                            <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-md border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="stallStartDate" className="block text-sm font-medium text-slate-700">Booking Start Date</label>
                                        <input type="date" id="stallStartDate" value={stallStartDate} onChange={e => setStallStartDate(e.target.value)} className="mt-1 block w-full input-style" required={stallRegistrationOpen} />
                                    </div>
                                    <div>
                                        <label htmlFor="stallEndDate" className="block text-sm font-medium text-slate-700">Booking End Date</label>
                                        <input type="date" id="stallEndDate" value={stallEndDate} onChange={e => setStallEndDate(e.target.value)} className="mt-1 block w-full input-style" required={stallRegistrationOpen} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="stallPricePerTablePerDay" className="block text-sm font-medium text-slate-700">Price per Table/Day (₹)</label>
                                        <input type="number" id="stallPricePerTablePerDay" value={stallPricePerTablePerDay} onChange={e => setStallPricePerTablePerDay(e.target.value)} className="mt-1 block w-full input-style" required={stallRegistrationOpen} min="0" />
                                    </div>
                                    <div>
                                        <label htmlFor="stallElectricityCostPerDay" className="block text-sm font-medium text-slate-700">Electricity Cost per Day (₹)</label>
                                        <input type="number" id="stallElectricityCostPerDay" value={stallElectricityCostPerDay} onChange={e => setStallElectricityCostPerDay(e.target.value)} className="mt-1 block w-full input-style" required={stallRegistrationOpen} min="0" />
                                    </div>
                                </div>
                            </div>
                        )}
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