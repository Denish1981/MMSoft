
import React, { useState, useEffect } from 'react';
import type { Sponsor } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { CameraIcon } from './icons/CameraIcon';
import CameraCapture from './CameraCapture';

interface SponsorModalProps {
    sponsorToEdit: Sponsor | null;
    onClose: () => void;
    onSubmit: (sponsor: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({ sponsorToEdit, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [businessCategory, setBusinessCategory] = useState('');
    const [businessInfo, setBusinessInfo] = useState('');
    const [sponsorshipAmount, setSponsorshipAmount] = useState('');
    const [sponsorshipType, setSponsorshipType] = useState('');
    const [datePaid, setDatePaid] = useState('');
    const [paymentReceivedBy, setPaymentReceivedBy] = useState('');
    const [image, setImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        if (sponsorToEdit) {
            setName(sponsorToEdit.name);
            setContactNumber(sponsorToEdit.contactNumber);
            setAddress(sponsorToEdit.address);
            setEmail(sponsorToEdit.email || '');
            setBusinessCategory(sponsorToEdit.businessCategory);
            setBusinessInfo(sponsorToEdit.businessInfo);
            setSponsorshipAmount(String(sponsorToEdit.sponsorshipAmount));
            setSponsorshipType(sponsorToEdit.sponsorshipType);
            setDatePaid(sponsorToEdit.datePaid ? new Date(sponsorToEdit.datePaid).toISOString().split('T')[0] : '');
            setPaymentReceivedBy(sponsorToEdit.paymentReceivedBy || '');
            setImage(sponsorToEdit.image);
            setImagePreview(sponsorToEdit.image || null);
        } else {
            // Reset form for new entry
            setName('');
            setContactNumber('');
            setAddress('');
            setEmail('');
            setBusinessCategory('');
            setBusinessInfo('');
            setSponsorshipAmount('');
            setSponsorshipType('');
            setDatePaid(new Date().toISOString().split('T')[0]);
            setPaymentReceivedBy('');
            setImage(undefined);
            setImagePreview(null);
        }
    }, [sponsorToEdit]);

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
        if (!name || !contactNumber || !address || !businessCategory || !businessInfo || !sponsorshipAmount || !sponsorshipType || !datePaid || !paymentReceivedBy) {
            alert('Please fill out all required fields.');
            return;
        }
        onSubmit({
            name,
            contactNumber,
            address,
            email,
            businessCategory,
            businessInfo,
            sponsorshipAmount: parseFloat(sponsorshipAmount),
            sponsorshipType,
            datePaid: datePaid,
            paymentReceivedBy,
            image,
        });
    };

    const isEditing = !!sponsorToEdit;

    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 overflow-y-auto max-h-[95vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Sponsor' : 'Add New Sponsor'}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="sponsorName" className="block text-sm font-medium text-slate-700">Sponsor Name</label>
                                <input type="text" id="sponsorName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                            <div>
                                <label htmlFor="businessCategory" className="block text-sm font-medium text-slate-700">Business Category</label>
                                <input type="text" id="businessCategory" value={businessCategory} onChange={e => setBusinessCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="sponsorshipAmount" className="block text-sm font-medium text-slate-700">Sponsorship Amount (₹)</label>
                                <input type="number" id="sponsorshipAmount" value={sponsorshipAmount} onChange={e => setSponsorshipAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required min="1" />
                            </div>
                            <div>
                                <label htmlFor="datePaid" className="block text-sm font-medium text-slate-700">Date Paid</label>
                                <input type="date" id="datePaid" value={datePaid} onChange={e => setDatePaid(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="sponsorshipType" className="block text-sm font-medium text-slate-700">Sponsorship Type</label>
                                <input type="text" id="sponsorshipType" value={sponsorshipType} onChange={e => setSponsorshipType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                            <div>
                                <label htmlFor="paymentReceivedBy" className="block text-sm font-medium text-slate-700">Payment Received By</label>
                                <input type="text" id="paymentReceivedBy" value={paymentReceivedBy} onChange={e => setPaymentReceivedBy(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="contactNumber" className="block text-sm font-medium text-slate-700">Contact Number</label>
                                <input type="tel" id="contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                            </div>
                             <div>
                                <label htmlFor="sponsorEmail" className="block text-sm font-medium text-slate-700">Email (Optional)</label>
                                <input type="email" id="sponsorEmail" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                        <div>
                             <label htmlFor="address" className="block text-sm font-medium text-slate-700">Address / Location</label>
                             <input type="text" id="address" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                        <div>
                            <label htmlFor="businessInfo" className="block text-sm font-medium text-slate-700">Business Info</label>
                            <textarea id="businessInfo" value={businessInfo} onChange={e => setBusinessInfo(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
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
                                        <img src={imagePreview} alt="Sponsor preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                                         <button type="button" onClick={() => { setImage(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-4 space-x-2">
                             <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Sponsor' : 'Add Sponsor'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};