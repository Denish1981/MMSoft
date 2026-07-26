import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ContributionStatus, type Campaign, type Festival, type Contribution } from '../types/index';
import { formatDateForInput } from '../utils/formatting';
import { compressImageFile } from '../utils/imageUtils';
import { CloseIcon } from './icons/CloseIcon';
import CameraCapture from './CameraCapture';
import { DonorFields } from './donation/DonorFields';
import { ContributionFields } from './donation/ContributionFields';
import { ImageUploadSection } from './donation/ImageUploadSection';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { API_URL } from '../config';

interface ContributionModalProps {
    festivals?: Festival[];
    campaigns?: Campaign[];
    contributionToEdit: Contribution | null;
    onClose: () => void;
    onSubmit: (contribution: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({ festivals = [], campaigns = [], contributionToEdit, onClose, onSubmit }) => {
    const { user, token } = useAuth();
    const { contributions: globalContributions, stallRegistrations = [] } = useData();
    const location = useLocation();
    const isDonorPortalPage = location.pathname.startsWith('/donor-portal');

    const initialLoadDoneRef = useRef<boolean>(false);
    const lastContributionIdRef = useRef<number | null | undefined>(undefined);

    const isManagerOrAdmin = Boolean(
        user && (
            user.permissions?.includes('action:users:manage') ||
            user.permissions?.includes('action:edit') ||
            user.roles?.includes('Admin') ||
            user.roles?.includes('Manager')
        )
    );
    const isDonorUser = !isManagerOrAdmin;

    const [fetchedFestivals, setFetchedFestivals] = useState<Festival[]>([]);
    const [donorName, setDonorName] = useState('');
    const [donorEmail, setDonorEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [towerNumber, setTowerNumber] = useState('');
    const [flatNumber, setFlatNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [numberOfCoupons, setNumberOfCoupons] = useState('');
    
    useEffect(() => {
        if (festivals.length === 0) {
            fetch(`${API_URL}/festivals`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setFetchedFestivals(data);
                }
            })
            .catch(err => console.error("Error fetching festivals in ContributionModal:", err));
        }
    }, [festivals, token]);

    const activeFestivals = festivals.length > 0 ? festivals : fetchedFestivals;
    const defaultFestivalId = activeFestivals[0]?.id || null;
    const [festivalId, setFestivalId] = useState<number | null>(defaultFestivalId);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDropdownType, setSelectedDropdownType] = useState<string>('Online');
    const [customType, setCustomType] = useState<string>('');
    const [status, setStatus] = useState<ContributionStatus>(ContributionStatus.Completed);
    const [image, setImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        const currentEditId = contributionToEdit ? contributionToEdit.id : null;
        if (initialLoadDoneRef.current && lastContributionIdRef.current === currentEditId) {
            return;
        }
        initialLoadDoneRef.current = true;
        lastContributionIdRef.current = currentEditId;

        const defaultFestId = activeFestivals[0]?.id || null;
        if (contributionToEdit) {
            setDonorName(contributionToEdit.donorName || '');
            setDonorEmail(contributionToEdit.donorEmail || '');
            setMobileNumber(contributionToEdit.mobileNumber || '');
            setTowerNumber(contributionToEdit.towerNumber || '');
            setFlatNumber(contributionToEdit.flatNumber || '');
            setAmount(contributionToEdit.amount ? String(contributionToEdit.amount) : '');
            setNumberOfCoupons(contributionToEdit.numberOfCoupons ? String(contributionToEdit.numberOfCoupons) : '');
            
            let targetFestId = contributionToEdit.festivalId;
            if (!targetFestId && contributionToEdit.campaignId) {
                const matchFest = activeFestivals.find(f => f.campaignId === contributionToEdit.campaignId);
                if (matchFest) targetFestId = matchFest.id;
            }
            setFestivalId(targetFestId || defaultFestId);

            setDate(formatDateForInput(contributionToEdit.date) || new Date().toISOString().split('T')[0]);
            const currentType = contributionToEdit.type || 'Online';
            if (['Online', 'Cash', 'Donation Box', 'Miscellaneous'].includes(currentType)) {
                setSelectedDropdownType(currentType);
                setCustomType('');
            } else if (currentType.startsWith('Miscellaneous:')) {
                setSelectedDropdownType('Miscellaneous');
                setCustomType(currentType.substring('Miscellaneous:'.length).trim());
            } else {
                setSelectedDropdownType('Other');
                setCustomType(currentType);
            }
            setStatus(contributionToEdit.status || ContributionStatus.Completed);
            setImage(contributionToEdit.image);
            setImagePreview(contributionToEdit.image || null);
        } else {
            // ONLY pre-fill user profile info if opened on the Donor Portal & Updates page
            if (isDonorPortalPage) {
                const userEmail = user?.email?.toLowerCase()?.trim();
                const userId = user?.id;
                const userName = user?.fullName?.toLowerCase()?.trim();

                // Find latest contribution for this user as fallback
                const myLatestContribution = globalContributions.find(c => 
                    (userId && c.userId === userId) || 
                    (userEmail && c.donorEmail?.toLowerCase()?.trim() === userEmail) ||
                    (userName && userName !== userEmail && c.donorName?.toLowerCase()?.trim() === userName)
                );

                // Find latest stall registration for this user as fallback
                const myLatestStall = stallRegistrations.find(s =>
                    (userId && s.userId === userId) ||
                    (userEmail && s.email?.toLowerCase()?.trim() === userEmail)
                );

                const prefName = (user?.fullName && !user.fullName.includes('@')) 
                    ? user.fullName 
                    : (myLatestContribution?.donorName || myLatestStall?.registrantName || user?.fullName || user?.email || '');

                const prefEmail = user?.email || myLatestContribution?.donorEmail || myLatestStall?.email || '';
                const prefMobile = user?.mobileNumber || myLatestContribution?.mobileNumber || myLatestStall?.contactNumber || '';
                const prefTower = user?.towerNumber || myLatestContribution?.towerNumber || myLatestStall?.towerNumber || '';
                const prefFlat = user?.flatNumber || myLatestContribution?.flatNumber || myLatestStall?.flatNumber || '';

                setDonorName(prefName);
                setDonorEmail(prefEmail);
                setMobileNumber(prefMobile);
                setTowerNumber(prefTower);
                setFlatNumber(prefFlat);
            } else {
                setDonorName('');
                setDonorEmail('');
                setMobileNumber('');
                setTowerNumber('');
                setFlatNumber('');
            }
            setAmount('');
            setNumberOfCoupons('');
            setFestivalId(defaultFestId);
            setDate(new Date().toISOString().split('T')[0]);
            setSelectedDropdownType('Online');
            setCustomType('');
            setStatus(ContributionStatus.Completed);
            setImage(undefined);
            setImagePreview(null);
        }
    }, [contributionToEdit, activeFestivals, isDonorPortalPage, user, globalContributions, stallRegistrations]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedString = await compressImageFile(file);
                setImage(compressedString);
                setImagePreview(compressedString);
            } catch (err) {
                console.error("Error compressing image file:", err);
                alert("Failed to process image file. Please try selecting a different image.");
            }
        }
        e.target.value = '';
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setImage(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isMisc = selectedDropdownType === 'Miscellaneous';
        if (!donorName || !amount || !festivalId || (!isMisc && (!towerNumber || !flatNumber || !numberOfCoupons)) || !date) {
            alert('Please fill out all required fields.');
            return;
        }
        const finalType = selectedDropdownType === 'Other' 
            ? (customType.trim() || 'Other') 
            : (selectedDropdownType === 'Miscellaneous' && customType.trim())
                ? `Miscellaneous: ${customType.trim()}`
                : selectedDropdownType;
        
        const selectedFest = activeFestivals.find(f => f.id === festivalId);
        const derivedCampaignId = selectedFest?.campaignId || (contributionToEdit?.campaignId ?? null);

        const submissionData: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt'> = {
            donorName,
            donorEmail,
            mobileNumber,
            towerNumber: isMisc ? 'N/A' : towerNumber,
            flatNumber: isMisc ? 'N/A' : flatNumber,
            amount: parseFloat(amount),
            numberOfCoupons: isMisc ? 0 : parseInt(numberOfCoupons, 10),
            festivalId,
            campaignId: derivedCampaignId,
            date: date,
            type: finalType,
            image,
            status,
        };
        onSubmit(submissionData);
    };
    
    const isEditing = !!(contributionToEdit && contributionToEdit.id);
    const isMiscellaneous = selectedDropdownType === 'Miscellaneous';
    // Disable donor profile fields ONLY for standard Donors on the Donor Portal page when fields are pre-filled
    const disabledDonorName = isDonorUser && isDonorPortalPage && Boolean(user?.fullName || user?.email);
    const disabledTowerNumber = isDonorUser && isDonorPortalPage && Boolean(user?.towerNumber);
    const disabledFlatNumber = isDonorUser && isDonorPortalPage && Boolean(user?.flatNumber);

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
                        <DonorFields
                            donorName={donorName}
                            setDonorName={setDonorName}
                            donorEmail={donorEmail}
                            setDonorEmail={setDonorEmail}
                            mobileNumber={mobileNumber}
                            setMobileNumber={setMobileNumber}
                            towerNumber={towerNumber}
                            setTowerNumber={setTowerNumber}
                            flatNumber={flatNumber}
                            setFlatNumber={setFlatNumber}
                            isMiscellaneous={isMiscellaneous}
                            disabledDonorName={disabledDonorName}
                            disabledTowerNumber={disabledTowerNumber}
                            disabledFlatNumber={disabledFlatNumber}
                        />

                        <ContributionFields
                            amount={amount}
                            setAmount={setAmount}
                            date={date}
                            setDate={setDate}
                            numberOfCoupons={numberOfCoupons}
                            setNumberOfCoupons={setNumberOfCoupons}
                            selectedDropdownType={selectedDropdownType}
                            setSelectedDropdownType={setSelectedDropdownType}
                            customType={customType}
                            setCustomType={setCustomType}
                            status={status}
                            setStatus={setStatus}
                            festivalId={festivalId}
                            setFestivalId={setFestivalId}
                            festivals={activeFestivals}
                        />

                        <ImageUploadSection
                            imagePreview={imagePreview}
                            onFileChange={handleFileChange}
                            onOpenCamera={() => setIsCameraOpen(true)}
                            onClearImage={() => { setImage(undefined); setImagePreview(null); }}
                        />

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
