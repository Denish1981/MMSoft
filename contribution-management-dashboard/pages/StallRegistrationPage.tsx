
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Festival as PublicFestival, StallRegistrationProduct } from '../types/index';
import { API_URL } from '../config';
import { CameraIcon } from '../components/icons/CameraIcon';
import CameraCapture from '../components/CameraCapture';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';
import { CloseIcon } from '../components/icons/CloseIcon';

const StallRegistrationPage: React.FC = () => {
    const { id: festivalId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [festival, setFestival] = useState<PublicFestival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Form State
    const [registrantName, setRegistrantName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [dateToAdd, setDateToAdd] = useState('');
    const [products, setProducts] = useState<Partial<StallRegistrationProduct>[]>([{ productName: '', price: undefined }]);
    const [needsElectricity, setNeedsElectricity] = useState(false);
    const [numberOfTables, setNumberOfTables] = useState(1);
    const [paymentScreenshot, setPaymentScreenshot] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    const isFormValid = useMemo(() => {
        return registrantName && contactNumber && selectedDates.length > 0 && products.some(p => p.productName && p.price) && paymentScreenshot;
    }, [registrantName, contactNumber, selectedDates, products, paymentScreenshot]);

    const fetchFestival = useCallback(async () => {
        if (!festivalId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/public/festivals/${festivalId}`);
            if (!response.ok) throw new Error('Festival not found or registration is closed.');
            setFestival(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load festival data.');
        } finally {
            setIsLoading(false);
        }
    }, [festivalId]);

    useEffect(() => {
        fetchFestival();
    }, [fetchFestival]);

    const availableDates = useMemo(() => {
        if (!festival?.stallStartDate || !festival.stallEndDate) return [];
        const dates = [];
        let currentDate = new Date(new Date(festival.stallStartDate).toISOString().slice(0, 10)); // Normalize to UTC
        const endDate = new Date(new Date(festival.stallEndDate).toISOString().slice(0, 10));

        while(currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }, [festival]);

    const totalCost = useMemo(() => {
        if (!festival || selectedDates.length === 0 || !festival.stallPricePerTablePerDay) return 0;
        const numberOfDays = selectedDates.length;
        const tableCost = numberOfDays * numberOfTables * festival.stallPricePerTablePerDay;
        const electricityCost = needsElectricity ? (numberOfDays * numberOfTables * (festival.stallElectricityCostPerDay || 0)) : 0;
        return tableCost + electricityCost;
    }, [selectedDates, numberOfTables, needsElectricity, festival]);

    const handleAddDate = () => {
        if (!dateToAdd || selectedDates.includes(dateToAdd)) return;
        setSelectedDates([...selectedDates, dateToAdd].sort());
        setDateToAdd('');
    };

    const handleRemoveDate = (dateToRemove: string) => setSelectedDates(prev => prev.filter(d => d !== dateToRemove));
    const handleProductChange = (index: number, field: keyof StallRegistrationProduct, value: string) => {
        const newProducts = [...products];
        (newProducts[index] as any)[field] = field === 'price' ? (value ? parseFloat(value) : undefined) : value;
        setProducts(newProducts);
    };

    const addProduct = () => setProducts([...products, { productName: '', price: undefined }]);
    const removeProduct = (index: number) => setProducts(products.filter((_, i) => i !== index));
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPaymentScreenshot(base64String);
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleCaptureComplete = (imageDataUrl: string) => {
        setPaymentScreenshot(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            setError('Please fill out all required fields.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        
        try {
            const response = await fetch(`${API_URL}/public/festivals/${festivalId}/register-stall`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registrantName, contactNumber, stallDates: selectedDates, 
                    products: products.filter(p => p.productName && p.price),
                    needsElectricity, numberOfTables, paymentScreenshot,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed. Please try again.');
            }
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            // Re-fetch festival data to get latest booking counts
            await fetchFestival();
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50">Loading registration form...</div>;

    if (isSuccess) return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
             <div className="p-8 text-center bg-white rounded-lg shadow-xl max-w-lg">
                <h3 className="text-2xl font-bold text-green-600">Registration Submitted!</h3>
                <p className="mt-2 text-slate-600">Thank you for registering for a stall. We will review your submission and be in touch shortly.</p>
                <button onClick={() => navigate('/')} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Back to Home</button>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-100 min-h-screen py-12 px-4">
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-2xl">
                <div className="p-8 border-b border-slate-200 text-center">
                    <h1 className="text-3xl font-bold text-slate-800">{festival?.name}</h1>
                    <p className="text-slate-500 mt-1">Stall Registration</p>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
                    
                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-slate-700 mb-2">Your Details</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="registrantName" className="block text-sm font-medium text-slate-700">Full Name *</label>
                                <input type="text" id="registrantName" value={registrantName} onChange={e => setRegistrantName(e.target.value)} className="mt-1 block w-full input-style" />
                            </div>
                            <div>
                                <label htmlFor="contactNumber" className="block text-sm font-medium text-slate-700">Contact Number *</label>
                                <input type="tel" id="contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="mt-1 block w-full input-style" />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-slate-700 mb-2">Stall Requirements</legend>
                         <div>
                            <label htmlFor="stallDate" className="block text-sm font-medium text-slate-700">Select Stall Dates *</label>
                            <div className="flex items-center gap-2 mt-1">
                                <select id="stallDate" value={dateToAdd} onChange={e => setDateToAdd(e.target.value)} className="block w-full input-style bg-white">
                                    <option value="" disabled>Choose a date...</option>
                                    {availableDates.map(date => {
                                        const totalBooked = festival?.stallDateCounts?.[date] || 0;
                                        const approvedBooked = festival?.approvedStallCounts?.[date] || 0;
                                        const isFull = festival?.maxStalls ? approvedBooked >= festival.maxStalls : false;
                                        const label = `${formatUTCDate(date)} ${festival?.maxStalls ? `(${totalBooked} / ${festival.maxStalls} booked)` : `(${totalBooked} booked)`}${isFull ? ' - Fully Booked' : ''}`;
                                        return <option key={date} value={date} disabled={isFull}>{label}</option>
                                    })}
                                </select>
                                <button type="button" onClick={handleAddDate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold" disabled={!dateToAdd}>Add</button>
                            </div>
                             <div className="mt-2 flex flex-wrap gap-2 empty:mt-0">
                                {selectedDates.map(date => (
                                <span key={date} className="flex items-center bg-slate-200 text-slate-800 text-sm font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                                    {formatUTCDate(date)}
                                    <button type="button" onClick={() => handleRemoveDate(date)} className="ml-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-300"><CloseIcon className="w-3.5 h-3.5"/></button>
                                </span>
                                ))}
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <label htmlFor="numberOfTables" className="block text-sm font-medium text-slate-700">Number of Tables *</label>
                                <input type="number" id="numberOfTables" value={numberOfTables} onChange={e => setNumberOfTables(Math.max(1, parseInt(e.target.value) || 1))} required min="1" className="mt-1 block w-full input-style" />
                            </div>
                             <label className="flex items-center space-x-2 md:mt-6">
                                <input type="checkbox" checked={needsElectricity} onChange={e => setNeedsElectricity(e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
                                <span className="text-sm font-medium text-slate-700">Need Electrical Connection?</span>
                            </label>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="text-lg font-semibold text-slate-700 mb-2">Products & Pricing *</legend>
                        <div className="space-y-2 mt-1">
                            {products.map((p, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input type="text" placeholder="Product Name" value={p.productName || ''} onChange={e => handleProductChange(index, 'productName', e.target.value)} className="w-full input-style" />
                                    <input type="number" placeholder="Price (₹)" value={p.price || ''} onChange={e => handleProductChange(index, 'price', e.target.value)} className="w-40 input-style" min="0" />
                                    {products.length > 1 && <button type="button" onClick={() => removeProduct(index)} className="text-red-500 hover:text-red-700"><DeleteIcon className="w-5 h-5"/></button>}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addProduct} className="mt-2 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                            <PlusIcon className="w-4 h-4 mr-1"/> Add Product
                        </button>
                    </fieldset>

                    <div className="pt-6 border-t border-slate-200 space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <p className="text-sm font-medium text-slate-600">Total Payment Due</p>
                            <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalCost)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Payment Screenshot *</label>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <label htmlFor="screenshotUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">Upload File</label>
                                <input id="screenshotUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                                <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700"><CameraIcon className="w-5 h-5 mr-2" /> Capture</button>
                            </div>
                            {imagePreview && <div className="mt-4"><div className="relative w-fit"><img src={imagePreview} alt="Payment preview" className="max-h-28 rounded-md border border-slate-200 p-1" /><button type="button" onClick={() => { setPaymentScreenshot(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><CloseIcon className="w-4 h-4" /></button></div></div>}
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting || !isFormValid} className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Submitting...' : 'Submit Stall Registration'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
        </div>
    );
};

export default StallRegistrationPage;
