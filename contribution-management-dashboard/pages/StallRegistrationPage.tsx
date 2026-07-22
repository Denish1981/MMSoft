import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Festival as PublicFestival, StallRegistrationProduct } from '../types/index';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import CameraCapture from '../components/CameraCapture';
import { RegistrationSuccessView } from '../components/stall-registration/RegistrationSuccessView';
import { PersonalDetailsSection } from '../components/stall-registration/PersonalDetailsSection';
import { StallRequirementsSection } from '../components/stall-registration/StallRequirementsSection';
import { ProductsPricingSection } from '../components/stall-registration/ProductsPricingSection';
import { PaymentSection } from '../components/stall-registration/PaymentSection';

const StallRegistrationPage: React.FC = () => {
    const { id: festivalId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [festival, setFestival] = useState<PublicFestival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Form State
    const [registrantName, setRegistrantName] = useState(user?.fullName || '');
    const [contactNumber, setContactNumber] = useState(user?.mobileNumber || '');
    const [towerNumber, setTowerNumber] = useState(user?.towerNumber || '');
    const [flatNumber, setFlatNumber] = useState(user?.flatNumber || '');

    useEffect(() => {
        if (user) {
            if (user.fullName) setRegistrantName(user.fullName);
            if (user.mobileNumber) setContactNumber(user.mobileNumber);
            if (user.towerNumber) setTowerNumber(user.towerNumber);
            if (user.flatNumber) setFlatNumber(user.flatNumber);
        }
    }, [user]);
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

    const handleClearScreenshot = () => {
        setPaymentScreenshot(undefined);
        setImagePreview(null);
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
                    registrantName, contactNumber, towerNumber, flatNumber, stallDates: selectedDates, 
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

    if (isSuccess) return <RegistrationSuccessView onBackToHome={() => navigate('/')} />;

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
                    
                    <PersonalDetailsSection
                        registrantName={registrantName}
                        setRegistrantName={setRegistrantName}
                        contactNumber={contactNumber}
                        setContactNumber={setContactNumber}
                        towerNumber={towerNumber}
                        setTowerNumber={setTowerNumber}
                        flatNumber={flatNumber}
                        setFlatNumber={setFlatNumber}
                    />

                    <StallRequirementsSection
                        festival={festival}
                        availableDates={availableDates}
                        dateToAdd={dateToAdd}
                        setDateToAdd={setDateToAdd}
                        selectedDates={selectedDates}
                        onAddDate={handleAddDate}
                        onRemoveDate={handleRemoveDate}
                        numberOfTables={numberOfTables}
                        setNumberOfTables={setNumberOfTables}
                        needsElectricity={needsElectricity}
                        setNeedsElectricity={setNeedsElectricity}
                    />

                    <ProductsPricingSection
                        products={products}
                        onProductChange={handleProductChange}
                        onAddProduct={addProduct}
                        onRemoveProduct={removeProduct}
                    />

                    <PaymentSection
                        totalCost={totalCost}
                        imagePreview={imagePreview}
                        onFileChange={handleFileChange}
                        onOpenCamera={() => setIsCameraOpen(true)}
                        onClearScreenshot={handleClearScreenshot}
                    />
                    
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
