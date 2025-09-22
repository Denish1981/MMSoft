import React, { useState, useEffect } from 'react';
import { ContributionStatus, type Campaign, type Contribution, type ContributionType } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { CameraIcon } from '../components/icons/CameraIcon';
import { CloseIcon } from '../components/icons/CloseIcon';
import CameraCapture from '../components/CameraCapture';
import { formatCurrency } from '../utils/formatting';
import { API_URL } from '../config';
import { useData } from '../contexts/DataContext';

interface BulkAddPageProps {}

type StagedContribution = Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

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

const StatusBadge: React.FC<{ status: ContributionStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    const statusClasses = {
        [ContributionStatus.Completed]: "bg-green-100 text-green-800",
        [ContributionStatus.Pending]: "bg-yellow-100 text-yellow-800",
        [ContributionStatus.Failed]: "bg-red-100 text-red-800",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


const BulkAddPage: React.FC<BulkAddPageProps> = () => {
    const { token, logout } = useAuth();
    const { campaigns, fetchData: onBulkSaveSuccess } = useData();
    const [stagedContributions, setStagedContributions] = useState<StagedContribution[]>([]);
    const [formData, setFormData] = useState<StagedContribution>(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        // Set default campaign when campaigns load
        if (campaigns.length > 0 && !formData.campaignId) {
            setFormData(prev => ({ ...prev, campaignId: campaigns[0]?.id || null }));
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
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFormData((prev: StagedContribution) => ({ ...prev, image: base64String }));
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setFormData((prev: StagedContribution) => ({ ...prev, image: imageDataUrl }));
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };


    const handleAddToList = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.donorName || !formData.amount || !formData.campaignId || !formData.towerNumber || !formData.flatNumber || !formData.date) {
            setError('Please fill out all required fields.');
            return;
        }

        setStagedContributions((prev: StagedContribution[]) => [...prev, formData]);
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
    
    const handleRemoveFromList = (index: number) => {
        setStagedContributions((prev: StagedContribution[]) => prev.filter((_, i) => i !== index));
    };

    const handleSaveAll = async () => {
        if (stagedContributions.length === 0) return;
        
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch(`${API_URL}/contributions/bulk`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ contributions: stagedContributions }),
            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save contributions`);
            }
            
            setSuccessMessage(`${stagedContributions.length} contributions saved successfully!`);
            setStagedContributions([]);
            onBulkSaveSuccess(); // This will trigger a re-fetch in App.tsx

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };
    
    return (
        <div className="space-y-6">
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            {/* Action Header */}
            <div className="bg-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-lg font-semibold text-slate-800">Stage & Save Contributions</h2>
                    <p className="text-sm text-slate-500">Add contributions to the list below, then save all at once.</p>
                </div>
                 <button
                    onClick={handleSaveAll}
                    disabled={isLoading || stagedContributions.length === 0}
                    className="flex items-center justify-center w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Saving...' : <><SaveIcon className="w-5 h-5 mr-2" /> Save All ({stagedContributions.length})</>}
                </button>
            </div>
            
             {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
             {successMessage && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md" role="alert"><p>{successMessage}</p></div>}

            {/* Form Card */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <form onSubmit={handleAddToList} className="space-y-4">
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
                            <select id="type" name="type" value={formData.type || 'Online'} onChange={handleInputChange} className="mt-1 block w-full input-style bg-white" required>
                                <option value="Online">Online</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
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
            </div>

            {/* Staged Contributions Table */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-semibold text-slate-800 mb-4">Staged Contributions ({stagedContributions.length})</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Donor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Residence</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Coupons</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-slate-200">
                             {stagedContributions.map((c, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.donorName}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{`T-${c.towerNumber}, F-${c.flatNumber}`}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold text-right">{formatCurrency(c.amount)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{c.numberOfCoupons}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                                        <StatusBadge status={c.status} />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        {c.image ? (
                                            <img src={c.image} alt="Staged thumbnail" className="h-10 w-16 object-cover rounded-md mx-auto" />
                                        ) : (
                                            <span className="text-slate-400 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        <button onClick={() => handleRemoveFromList(index)} className="text-red-600 hover:text-red-900" title="Remove">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                     {stagedContributions.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-slate-500">No contributions have been added to the list yet.</p>
                            <p className="text-sm text-slate-400">Use the form above to add contributions.</p>
                        </div>
                     )}
                 </div>
            </div>
             <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
        </div>
    );
};

export default BulkAddPage;
