import React, { useState, useEffect } from 'react';
import { ContributionStatus, type Campaign, type Contribution, type ContributionType } from '../types/index';
import { CloseIcon } from './icons/CloseIcon';
import { CameraIcon } from './icons/CameraIcon';
import CameraCapture from './CameraCapture';

interface ContributionModalProps {
    campaigns: Campaign[];
    contributionToEdit: Contribution | null;
    onClose: () => void;
    onSubmit: (contribution: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({ campaigns, contributionToEdit, onClose, onSubmit }) => {
    const [donorName, setDonorName] = useState('');
    const [donorEmail, setDonorEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [towerNumber, setTowerNumber] = useState('');
    const [flatNumber, setFlatNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [numberOfCoupons, setNumberOfCoupons] = useState('');
    const [campaignId, setCampaignId] = useState<number | null>(campaigns[0]?.id || null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<ContributionType>('Online');
    const [status, setStatus] = useState<ContributionStatus>(ContributionStatus.Completed);
    const [image, setImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        if (contributionToEdit) {
            setDonorName(contributionToEdit.donorName);
            setDonorEmail(contributionToEdit.donorEmail || '');
            setMobileNumber(contributionToEdit.mobileNumber || '');
            setTowerNumber(contributionToEdit.towerNumber);
            setFlatNumber(contributionToEdit.flatNumber);
            setAmount(String(contributionToEdit.amount));
            setNumberOfCoupons(String(contributionToEdit.numberOfCoupons));
            setCampaignId(contributionToEdit.campaignId);
            setDate(new Date(contributionToEdit.date).toISOString().split('T')[0]);
            setType(contributionToEdit.type || 'Online');
            setStatus(contributionToEdit.status);
            setImage(contributionToEdit.image);
            setImagePreview(contributionToEdit.image || null);
        } else {
            // Reset form for new entry to prevent state leakage from a previous edit
            setDonorName('');
            setDonorEmail('');
            setMobileNumber('');
            setTowerNumber('');
            setFlatNumber('');
            setAmount('');
            setNumberOfCoupons('');
            setCampaignId(campaigns[0]?.id || null);
            setDate(new Date().toISOString().split('T')[0]);
            setType('Online');
            setStatus(ContributionStatus.Completed);
            setImage(undefined);
            setImagePreview(null);
        }
    }, [contributionToEdit, campaigns]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImage(base64String);
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setImage(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!donorName || !amount || !campaignId || !towerNumber || !flatNumber || !numberOfCoupons || !date) {
            alert('Please fill out all required fields.');
            return;
        }
        const submissionData: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'> = {
            donorName,
            donorEmail,
            mobileNumber,
            towerNumber,
            flatNumber,
            amount: parseFloat(amount),
            numberOfCoupons: parseInt(numberOfCoupons, 10),
            campaignId,
            date: date,
            type,
            image,
            status,
        };
        onSubmit(submissionData);
    };
    
    const isEditing = !!contributionToEdit;

    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 overflow-y-auto max-h-[95vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Contribution' : 'Add New Contribution'}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="donorName" className="block text-sm font-medium text-slate-700">Donor Name</label>
                            <input type="text" id="donorName" value={donorName} onChange={e => setDonorName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="donorEmail" className="block text-sm font-medium text-slate-700">Donor Email (Optional)</label>
                                <input type="email" id="donorEmail" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700">Mobile Number (Optional)</label>
                                <input type="tel" id="mobileNumber" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="towerNumber" className="block text-sm font-medium text-slate-700">Tower Number</label>
                                <input type="text" id="towerNumber" value={towerNumber} onChange={e => setTowerNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                            <div>
                                <label htmlFor="flatNumber" className="block text-sm font-medium text-slate-700">Flat Number</label>
                                <input type="text" id="flatNumber" value={flatNumber} onChange={e => setFlatNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-slate-700">Amount (₹)</label>
                                <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required min="1" />
                            </div>
                            <div>
                                <label htmlFor="contributionDate" className="block text-sm font-medium text-slate-700">Date</label>
                                <input type="date" id="contributionDate" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="numberOfCoupons" className="block text-sm font-medium text-slate-700">No of Coupons</label>
                                <input type="number" id="numberOfCoupons" value={numberOfCoupons} onChange={e => setNumberOfCoupons(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required min="0" />
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-slate-700">Type</label>
                                <select id="type" value={type} onChange={e => setType(e.target.value as ContributionType)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                                    <option value="Online">Online</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                                <select id="status" value={status} onChange={e => setStatus(e.target.value as ContributionStatus)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                                    {Object.values(ContributionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="campaign" className="block text-sm font-medium text-slate-700">Campaign</label>
                            <select id="campaign" value={campaignId || ''} onChange={e => setCampaignId(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
                                <option value="" disabled>Select a campaign</option>
                                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Image (Optional)</label>
                             <div className="mt-2 grid grid-cols-2 gap-4">
                                <label htmlFor="imageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                                    Upload File
                                    <input id="imageUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                                </label>
                                <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                                    <CameraIcon className="w-5 h-5 mr-2" />
                                    Capture Image
                                </button>
                            </div>
                            {imagePreview && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-slate-600 mb-2">Image Preview:</p>
                                    <div className="relative">
                                        <img src={imagePreview} alt="Contribution preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                                         <button type="button" onClick={() => { setImage(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 space-x-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Contribution' : 'Add Contribution'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};