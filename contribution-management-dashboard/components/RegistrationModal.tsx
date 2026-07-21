import React, { useState } from 'react';
import { CameraIcon } from './icons/CameraIcon';
import { API_URL } from '../config';
import { CloseIcon } from './icons/CloseIcon';
import type { RegistrationFormField } from '../types/index';
import CameraCapture from './CameraCapture';

export interface PublicEvent {
    id: number;
    name: string;
    description: string;
    eventDate: string;
    startTime: string;
    endTime: string | null;
    venue: string;
    registrationFormSchema: RegistrationFormField[];
}

interface RegistrationModalProps {
    event: PublicEvent;
    onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ event, onClose }) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [paymentProofImage, setPaymentProofImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    const [showProofUpload, setShowProofUpload] = useState(false);

    const handleInputChange = (name: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPaymentProofImage(base64String);
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setPaymentProofImage(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const towerNumber = formData['tower_number'];
        const flatNumber = formData['flat_number'];
        
        let contributionExists = false;
        // Only check if tower/flat numbers are provided.
        if (towerNumber && flatNumber) {
            try {
                const response = await fetch(`${API_URL}/public/check-contribution?towerNumber=${encodeURIComponent(towerNumber)}&flatNumber=${encodeURIComponent(flatNumber)}`);
                if (response.ok) {
                    const data = await response.json();
                    contributionExists = data.contributionExists;
                }
            } catch (error) {
                console.error("Failed to check contribution status", error);
            }
        }

        if (!contributionExists && !paymentProofImage) {
            // Contribution doesn't exist, and no proof provided.
            // Show the upload field and stop submission.
            setShowProofUpload(true);
            setError("We couldn't find a contribution record for your residence. Please upload a payment screenshot to complete registration.");
            setIsLoading(false);
            return;
        }
        
        // If we reach here, we are ready to submit.
        try {
            const submissionBody = {
                formData,
                paymentProofImage: contributionExists ? undefined : paymentProofImage,
            };
            const response = await fetch(`${API_URL}/public/events/${event.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionBody),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed. Please try again.');
            }
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderField = (field: RegistrationFormField) => {
        switch (field.type) {
            case 'textarea':
                return <textarea id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style" rows={3}></textarea>;
            case 'select':
                return (
                    <select id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style bg-white">
                        <option value="" disabled>Select an option</option>
                        {field.options?.split(',').map(opt => <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>)}
                    </select>
                );
            case 'checkbox':
                return (
                    <label className="flex items-center space-x-2 mt-2">
                        <input type="checkbox" id={field.name} checked={!!formData[field.name]} onChange={e => handleInputChange(field.name, e.target.checked)} required={field.required} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
                        <span className="text-sm text-slate-600">{field.label} {field.required && '*'}</span>
                    </label>
                );
            default:
                return <input type={field.type} id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style" />;
        }
    };

    return (
        <>
        {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Register for {event.name}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </div>

                {isSuccess ? (
                    <div className="p-8 text-center">
                        <h3 className="text-2xl font-bold text-green-600">Registration Confirmed!</h3>
                        <p className="mt-2 text-slate-600">Thank you for registering. We look forward to seeing you at the event.</p>
                        <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {(event.registrationFormSchema || []).map(field => (
                            <div key={field.name}>
                                {field.type !== 'checkbox' && (
                                    <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">{field.label} {field.required && '*'}</label>
                                )}
                                {renderField(field)}
                            </div>
                        ))}

                        {showProofUpload && (
                             <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-700">Proof of Contribution</label>
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
                                        <div className="relative w-fit">
                                            <img src={imagePreview} alt="Contribution preview" className="max-h-28 rounded-md border border-slate-200 p-1" />
                                             <button type="button" onClick={() => { setPaymentProofImage(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                                <CloseIcon className="w-4 h-4" />
                                             </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <p className="text-sm text-red-600 pt-2">{error}</p>}
                        <div className="pt-2">
                            <button type="submit" disabled={isLoading} className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-400">
                                {isLoading ? 'Submitting...' : 'Submit Registration'}
                            </button>
                        </div>
                    </form>
                )}
                 <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
            </div>
        </div>
        </>
    );
};
