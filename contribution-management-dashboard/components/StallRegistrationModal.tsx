import React, { useState, useEffect, useMemo } from 'react';
import type { Festival as PublicFestival, StallRegistrationProduct } from '../types';
import { API_URL } from '../config';
import { CloseIcon } from './icons/CloseIcon';
import { CameraIcon } from './icons/CameraIcon';
import CameraCapture from './CameraCapture';
import { PlusIcon } from './icons/PlusIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';

interface StallRegistrationModalProps {
    festival: PublicFestival;
    onClose: () => void;
}

const StallRegistrationModal: React.FC<StallRegistrationModalProps> = ({ festival, onClose }) => {
    const [registrantName, setRegistrantName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [dateToAdd, setDateToAdd] = useState('');
    const [products, setProducts] = useState<Partial<StallRegistrationProduct>[]>([{ productName: '', price: undefined }]);
    const [needsElectricity, setNeedsElectricity] = useState(false);
    const [numberOfTables, setNumberOfTables] = useState(1);
    const [paymentScreenshot, setPaymentScreenshot] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const totalCost = useMemo(() => {
        if (selectedDates.length === 0 || !festival.stallPricePerTablePerDay) return 0;
        
        const numberOfDays = selectedDates.length;
        
        const tableCost = numberOfDays * numberOfTables * festival.stallPricePerTablePerDay;
        const electricityCost = needsElectricity ? (numberOfDays * (festival.stallElectricityCostPerDay || 0)) : 0;
        
        return tableCost + electricityCost;
    }, [selectedDates, numberOfTables, needsElectricity, festival]);

    const handleAddDate = () => {
        if (!dateToAdd) return;
        if (selectedDates.includes(dateToAdd)) {
            alert('This date has already been selected.');
            return;
        }
        const newDates = [...selectedDates, dateToAdd].sort();
        setSelectedDates(newDates);
        setDateToAdd('');
    };

    const handleRemoveDate = (index: number) => {
        setSelectedDates(prev => prev.filter((_, i) => i !== index));
    };
    
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
        setError('');
        
        if (selectedDates.length === 0) {
            setError('Please select at least one date for your stall.');
            return;
        }
        
        const finalProducts = products.filter(p => p.productName && p.price).map(p => ({...p, price: Number(p.price)}));
        if (finalProducts.length === 0) {
            setError('Please add at least one product with its name and price.');
            return;
        }

        if (!paymentScreenshot) {
            setError('Please upload a screenshot of your payment.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/public/festivals/${festival.id}/register-stall`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registrantName, contactNumber, stallDates: selectedDates, 
                    products: finalProducts, needsElectricity, numberOfTables, paymentScreenshot,
                }),
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
    
    return (
        <>
            {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center p-4 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">Stall Registration: {festival.name}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                    </div>

                    {isSuccess ? (
                         <div className="p-8 text-center">
                            <h3 className="text-2xl font-bold text-green-600">Registration Submitted!</h3>
                            <p className="mt-2 text-slate-600">Thank you for registering for a stall. We will review your submission and be in touch shortly.</p>
                            <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Close</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Personal Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="registrantName" className="block text-sm font-medium text-slate-700">Full Name</label>
                                    <input type="text" id="registrantName" value={registrantName} onChange={e => setRegistrantName(e.target.value)} required className="mt-1 block w-full input-style" />
                                </div>
                                <div>
                                    <label htmlFor="contactNumber" className="block text-sm font-medium text-slate-700">Contact Number</label>
                                    <input type="tel" id="contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} required className="mt-1 block w-full input-style" />
                                </div>
                            </div>
                            {/* Stall Dates */}
                            <div>
                                <label htmlFor="stallDate" className="block text-sm font-medium text-slate-700">Select Stall Dates</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="date" id="stallDate" value={dateToAdd} onChange={e => setDateToAdd(e.target.value)} min={festival.stallStartDate} max={festival.stallEndDate} className="block w-full input-style" />
                                    <button type="button" onClick={handleAddDate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold">Add</button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 empty:mt-0">
                                    {selectedDates.map((date, index) => (
                                    <span key={index} className="flex items-center bg-slate-200 text-slate-800 text-sm font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                                        {formatUTCDate(date)}
                                        <button type="button" onClick={() => handleRemoveDate(index)} className="ml-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-300">
                                            <CloseIcon className="w-3.5 h-3.5"/>
                                        </button>
                                    </span>
                                    ))}
                                </div>
                            </div>
                            {/* Products */}
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Products & Pricing</label>
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
                            </div>
                            {/* Requirements */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <label htmlFor="numberOfTables" className="block text-sm font-medium text-slate-700">Number of Tables Required</label>
                                    <input type="number" id="numberOfTables" value={numberOfTables} onChange={e => setNumberOfTables(Math.max(1, parseInt(e.target.value) || 1))} required min="1" className="mt-1 block w-full input-style" />
                                </div>
                                 <label className="flex items-center space-x-2 mt-6">
                                    <input type="checkbox" checked={needsElectricity} onChange={e => setNeedsElectricity(e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
                                    <span className="text-sm font-medium text-slate-700">Need Electrical Connection?</span>
                                </label>
                            </div>
                            {/* Total and Payment */}
                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                    <p className="text-sm font-medium text-slate-600">Total Payment Due</p>
                                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalCost)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Payment Screenshot *</label>
                                    <div className="mt-2 grid grid-cols-2 gap-4">
                                        <label htmlFor="screenshotUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                                            Upload File
                                            <input id="screenshotUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                                        </label>
                                        <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                                            <CameraIcon className="w-5 h-5 mr-2" /> Capture
                                        </button>
                                    </div>
                                    {imagePreview && (
                                        <div className="mt-4"><div className="relative w-fit">
                                            <img src={imagePreview} alt="Payment preview" className="max-h-28 rounded-md border border-slate-200 p-1" />
                                            <button type="button" onClick={() => { setPaymentScreenshot(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><CloseIcon className="w-4 h-4" /></button>
                                        </div></div>
                                    )}
                                </div>
                            </div>
                            {error && <p className="text-sm text-red-600 pt-2">{error}</p>}
                            <div className="pt-2">
                                <button type="submit" disabled={isLoading || totalCost <= 0} className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-400">
                                    {isLoading ? 'Submitting...' : 'Submit Stall Registration'}
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
export default StallRegistrationModal;