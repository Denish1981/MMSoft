import React, { useState, useEffect } from 'react';
import { ContributionStatus, type StagedContribution } from '../types/index';
import { PlusIcon } from './icons/PlusIcon';
import { useData } from '../contexts/DataContext';
import { parseTowerAndFlatFromDonorName } from '../utils/donorLocationUtils';
import { compressImageFile } from '../utils/imageUtils';
import { ImageUploadSection } from './donation/ImageUploadSection';
import CameraCapture from './CameraCapture';

const getInitialFormState = (campaignId: number | null): StagedContribution => ({
    donorName: '',
    towerNumber: '',
    flatNumber: '',
    amount: 1500,
    numberOfCoupons: 0,
    donorEmail: '',
    mobileNumber: '',
    campaignId: campaignId,
    date: new Date().toISOString().split('T')[0],
    type: 'Online',
    status: ContributionStatus.Completed,
    image: undefined,
});

interface BulkAddFormProps {
    defaultCampaignId: number | null;
    onAddToList: (contribution: StagedContribution) => void;
    setError: (error: string) => void;
}

export const BulkAddForm: React.FC<BulkAddFormProps> = ({ defaultCampaignId, onAddToList, setError }) => {
    const { campaigns } = useData();
    const [formData, setFormData] = useState<StagedContribution>(() => getInitialFormState(defaultCampaignId));
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Keep campaign synced with the top default campaign if set
    useEffect(() => {
        if (defaultCampaignId) {
            setFormData(prev => ({ ...prev, campaignId: defaultCampaignId }));
        }
    }, [defaultCampaignId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'donorName') {
            const { towerNumber, flatNumber } = parseTowerAndFlatFromDonorName(value);
            setFormData((prev: StagedContribution) => ({
                ...prev,
                donorName: value,
                towerNumber,
                flatNumber,
            }));
            return;
        }
        if (name === 'amount') {
            const numAmount = value ? parseFloat(value) : 0;
            setFormData((prev: StagedContribution) => ({
                ...prev,
                amount: numAmount,
                numberOfCoupons: numAmount < 1500 ? 0 : prev.numberOfCoupons
            }));
            return;
        }
        if (name === 'numberOfCoupons') {
            const numVal = value ? parseFloat(value) : 0;
            if (numVal > 4) {
                alert('Maximum 4 coupons are allowed per contribution. Please contact GTMM if you need more than 4 coupons.');
                setFormData((prev: StagedContribution) => ({
                    ...prev,
                    numberOfCoupons: 4
                }));
                return;
            }
        }
        setFormData((prev: StagedContribution) => ({
            ...prev,
            [name]: (name === 'numberOfCoupons') 
                ? (value ? parseFloat(value) : 0) 
                : (name === 'campaignId' ? (value ? Number(value) : null) : value)
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsCompressing(true);
            try {
                const compressedBase64 = await compressImageFile(file);
                setFormData((prev: StagedContribution) => ({ ...prev, image: compressedBase64 }));
            } catch (err) {
                console.error("Image compression error:", err);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData((prev: StagedContribution) => ({ ...prev, image: reader.result as string }));
                };
                reader.readAsDataURL(file);
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleCameraCapture = (imageDataUrl: string) => {
        setFormData((prev: StagedContribution) => ({ ...prev, image: imageDataUrl }));
        setIsCameraOpen(false);
    };

    const handleClearImage = () => {
        setFormData((prev: StagedContribution) => ({ ...prev, image: undefined }));
    };

    const parsedInfo = parseTowerAndFlatFromDonorName(formData.donorName);
    const resolvedTower = formData.towerNumber || parsedInfo.towerNumber;
    const resolvedFlat = formData.flatNumber || parsedInfo.flatNumber;

    const isFormValid = Boolean(
        formData.donorName.trim() &&
        resolvedTower &&
        resolvedFlat &&
        formData.amount > 0 &&
        (formData.campaignId || defaultCampaignId) &&
        !isCompressing
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const donorTrimmed = formData.donorName.trim();
        const parsed = parseTowerAndFlatFromDonorName(donorTrimmed);
        const finalTower = formData.towerNumber || parsed.towerNumber;
        const finalFlat = formData.flatNumber || parsed.flatNumber;
        const activeCampaignId = formData.campaignId || defaultCampaignId;

        if (!donorTrimmed) {
            setError('Please enter Donor Name (e.g. 432106 or 43-2106).');
            return;
        }

        if (!finalTower || !finalFlat) {
            setError('Could not interpret Tower and Flat from Donor Name. Please enter as 432106 or 43-2106 (Tower 43, Flat 2106).');
            return;
        }

        if (!formData.amount || formData.amount <= 0) {
            setError('Please enter a valid contribution amount.');
            return;
        }

        if (!activeCampaignId) {
            setError('Please select a default campaign at the top of the page.');
            return;
        }

        const submissionItem: StagedContribution = {
            ...formData,
            campaignId: activeCampaignId,
            donorName: donorTrimmed,
            towerNumber: finalTower,
            flatNumber: finalFlat,
            date: formData.date || new Date().toISOString().split('T')[0],
            status: ContributionStatus.Completed,
            donorEmail: formData.donorEmail?.trim() || undefined,
            mobileNumber: formData.mobileNumber?.trim() || undefined,
            image: formData.image || undefined,
        };

        onAddToList(submissionItem);
        
        // Reset form for next entry, maintaining active campaign & payment type
        setFormData({
            ...getInitialFormState(defaultCampaignId),
            type: formData.type || 'Online',
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Donor Name interpreted as Tower-Flat */}
                    <div className="lg:col-span-2">
                        <label htmlFor="donorName" className="block text-sm font-medium text-slate-700">
                            Donor (Tower-Flat) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="donorName" 
                            name="donorName" 
                            placeholder="e.g. 432106 or 43-2106" 
                            value={formData.donorName} 
                            onChange={handleInputChange} 
                            className="mt-1 block w-full input-style" 
                            required
                            autoFocus
                        />
                        {formData.donorName.trim() && resolvedTower && resolvedFlat ? (
                            <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <span>✓</span> Tower {resolvedTower} &bull; Flat {resolvedFlat}
                            </p>
                        ) : formData.donorName.trim() ? (
                            <p className="mt-1 text-xs text-amber-600 font-medium">
                                Format: 432106 or 43-2106 (Tower 43, Flat 2106)
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-slate-400">
                                Enter e.g. 432106 or 43-2106 (Tower 43, Flat 2106)
                            </p>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
                            Amount (₹) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            type="number" 
                            id="amount" 
                            name="amount" 
                            value={formData.amount || ''} 
                            onChange={handleInputChange} 
                            className="mt-1 block w-full input-style" 
                            required 
                            min="1" 
                            placeholder="₹ Amount"
                        />
                    </div>

                    {/* Number of Coupons */}
                    <div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="numberOfCoupons" className="block text-sm font-medium text-slate-700">No of Coupons</label>
                            <span className="text-[11px] text-slate-500 font-normal">
                                {Number(formData.amount) < 1500 ? '(Min ₹1,500)' : '(Max 4)'}
                            </span>
                        </div>
                        <input 
                            type="number" 
                            id="numberOfCoupons" 
                            name="numberOfCoupons" 
                            value={Number(formData.amount) < 1500 ? '0' : (formData.numberOfCoupons || '')} 
                            disabled={Number(formData.amount) < 1500}
                            readOnly={Number(formData.amount) < 1500}
                            onChange={handleInputChange} 
                            className={`mt-1 block w-full input-style ${
                                Number(formData.amount) < 1500 ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white'
                            }`} 
                            required 
                            min="0" 
                            max="4" 
                        />
                        {Number(formData.amount) < 1500 ? (
                            <p className="mt-1 text-xs text-slate-500 font-medium">
                                Available for &ge; ₹1,500
                            </p>
                        ) : Number(formData.numberOfCoupons) >= 4 ? (
                            <p className="mt-1 text-xs text-amber-700 font-medium">
                                Max limit is 4 coupons.
                            </p>
                        ) : null}
                    </div>
                </div>

                {/* Payment Type Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-slate-700">Payment Type</label>
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
                                placeholder="e.g. Cheque, Neft, Gift, etc." 
                                className="mt-1 block w-full input-style bg-white" 
                                required 
                            />
                        </div>
                    )}
                </div>

                {/* Image Upload / Camera Section for Each Entry */}
                <div className="pt-2 border-t border-slate-200">
                    <ImageUploadSection
                        imagePreview={formData.image || null}
                        onFileChange={handleFileChange}
                        onOpenCamera={() => setIsCameraOpen(true)}
                        onClearImage={handleClearImage}
                        required={false}
                    />
                    {isCompressing && (
                        <p className="text-xs text-blue-600 mt-1 animate-pulse">Compressing and preparing image...</p>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={!isFormValid}
                        className={`flex items-center justify-center px-6 py-2.5 rounded-lg shadow-md transition-colors duration-200 ${
                            isFormValid
                                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75 font-medium'
                        }`}
                    >
                        <PlusIcon className="w-5 h-5 mr-2" /> Add to List
                    </button>
                </div>
            </form>

            {/* Camera Capture Modal */}
            {isCameraOpen && (
                <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}

            <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
        </div>
    );
};
