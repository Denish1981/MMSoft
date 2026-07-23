import React, { useState, useEffect } from 'react';
import { ContributionStatus, type StagedContribution } from '../types/index';
import { compressImageFile } from '../utils/imageUtils';
import { PlusIcon } from './icons/PlusIcon';
import { CameraIcon } from './icons/CameraIcon';
import { CloseIcon } from './icons/CloseIcon';
import CameraCapture from './CameraCapture';
import { useData } from '../contexts/DataContext';

const initialFormState: StagedContribution = {
    donorName: '',
    towerNumber: '',
    flatNumber: '',
    amount: 0,
    numberOfCoupons: 0,
    donorEmail: '',
    mobileNumber: '',
    campaignId: null,
    date: new Date().toISOString().split('T')[0],
    type: 'Online',
    status: ContributionStatus.Completed,
    image: undefined,
};

interface BulkAddFormProps {
    onAddToList: (contribution: StagedContribution) => void;
    setError: (error: string) => void;
}

export const BulkAddForm: React.FC<BulkAddFormProps> = ({ onAddToList, setError }) => {
    const { campaigns } = useData();
    const [formData, setFormData] = useState<StagedContribution>(initialFormState);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        if (campaigns.length > 0 && !formData.campaignId) {
            const activeCamp = campaigns.find(c => c.isActive) || campaigns[0];
            setFormData(prev => ({ ...prev, campaignId: activeCamp?.id || null }));
        }
    }, [campaigns, formData.campaignId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: StagedContribution) => ({
            ...prev,
            [name]: (name === 'amount' || name === 'numberOfCoupons') 
                ? (value ? parseFloat(value) : 0) 
                : (name === 'campaignId' ? (value ? Number(value) : null) : value)
        }));
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64String = await compressImageFile(file);
                setFormData((prev: StagedContribution) => ({ ...prev, image: base64String }));
                setImagePreview(base64String);
            } catch (err) {
                console.error("Error processing image file:", err);
            }
        }
        e.target.value = '';
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setFormData((prev: StagedContribution) => ({ ...prev, image: imageDataUrl }));
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.donorName || !formData.amount || !formData.campaignId || !formData.towerNumber || !formData.flatNumber || !formData.date) {
            setError('Please fill out all required fields.');
            return;
        }

        onAddToList(formData);
        
        // Reset form, but keep campaign, date, and type for faster entry
        setFormData(prev => ({
            ...initialFormState,
            campaignId: prev.campaignId,
            date: prev.date,
            type: prev.type,
            status: prev.status,
        }));
        setImagePreview(null);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="donorName" className="block text-sm font-medium text-slate-700">Donor Name</label>
                        <input type="text" id="donorName" name="donorName" value={formData.donorName} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
                    </div>
                     <div className="md:col-span-1">
                        <label htmlFor="towerNumber" className="block text-sm font-medium text-slate-700">Tower Number</label>
                        <input type="text" id="towerNumber" name="towerNumber" value={formData.towerNumber} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="flatNumber" className="block text-sm font-medium text-slate-700">Flat Number</label>
                        <input type="text" id="flatNumber" name="flatNumber" value={formData.flatNumber} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-slate-700">Amount (₹)</label>
                        <input type="number" id="amount" name="amount" value={formData.amount || ''} onChange={handleInputChange} className="mt-1 block w-full input-style" required min="1" />
                    </div>
                     <div>
                        <label htmlFor="numberOfCoupons" className="block text-sm font-medium text-slate-700">No of Coupons</label>
                        <input type="number" id="numberOfCoupons" name="numberOfCoupons" value={formData.numberOfCoupons || ''} onChange={handleInputChange} className="mt-1 block w-full input-style" required min="0" />
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                        <input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
                    </div>
                 </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="campaignId" className="block text-sm font-medium text-slate-700">Campaign</label>
                        <select id="campaignId" name="campaignId" value={formData.campaignId ?? ''} onChange={handleInputChange} className="mt-1 block w-full input-style bg-white" required>
                            <option value="" disabled>Select a campaign</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-slate-700">Type</label>
                        <select 
                            id="type" 
                            name="type" 
                            value={['Online', 'Cash', 'Donation Box'].includes(formData.type || 'Online') ? (formData.type || 'Online') : 'Other'} 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Other') {
                                    setFormData(prev => ({ ...prev, type: '' }));
                                } else {
                                    setFormData(prev => ({ ...prev, type: val }));
                                }
                            }} 
                            className="mt-1 block w-full input-style bg-white" 
                            required
                        >
                            <option value="Online">Online</option>
                            <option value="Cash">Cash</option>
                            <option value="Donation Box">Donation Box</option>
                            <option value="Other">Other...</option>
                        </select>
                    </div>
                    {!['Online', 'Cash', 'Donation Box'].includes(formData.type || '') && (
                        <div>
                            <label htmlFor="customType" className="block text-sm font-medium text-slate-700">Custom Type</label>
                            <input 
                                type="text" 
                                id="customType" 
                                name="type" 
                                value={formData.type || ''} 
                                onChange={handleInputChange} 
                                placeholder="e.g. Tea Stall, Gift, etc." 
                                className="mt-1 block w-full input-style bg-white" 
                                required 
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                         <select id="status" name="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full input-style bg-white" required>
                            {Object.values(ContributionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Image (Optional)</label>
                     <div className="mt-2 grid grid-cols-2 gap-4">
                        <label htmlFor="bulkImageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                            Upload File
                            <input id="bulkImageUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                        </label>
                        <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                            <CameraIcon className="w-5 h-5 mr-2" />
                            Capture Image
                        </button>
                    </div>
                    {imagePreview && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-slate-600 mb-2">Image Preview:</p>
                            <div className="relative w-fit">
                                <img src={imagePreview} alt="Contribution preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                                 <button type="button" onClick={() => { setFormData((prev: StagedContribution) => ({...prev, image: undefined})); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="flex justify-end pt-2">
                     <button type="submit" className="flex items-center justify-center bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                         <PlusIcon className="w-5 h-5 mr-2" /> Add to List
                     </button>
                </div>
            </form>
             <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
        </div>
    );
};
