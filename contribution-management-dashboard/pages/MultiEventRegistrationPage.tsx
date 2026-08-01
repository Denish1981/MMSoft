import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Calendar, CheckSquare, Square, ArrowLeft, CheckCircle2, 
    AlertCircle, Sparkles, Building2, User, Phone, Mail, 
    Upload, Camera, RefreshCw, Clock, Layers, Plus, Trash2, Users, UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import type { PublicEvent } from '../components/RegistrationModal';
import CameraCapture from '../components/CameraCapture';
import { compressImageFile } from '../utils/imageUtils';

export interface EventParticipantEntry {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    [key: string]: any;
}

export const MultiEventRegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string>('');

    // Primary Resident / Contact Form Data
    const [fullName, setFullName] = useState<string>('');
    const [contactNumber, setContactNumber] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [towerNumber, setTowerNumber] = useState<string>('');
    const [flatNumber, setFlatNumber] = useState<string>('');

    // Map of eventId -> Array of participants
    const [eventParticipantsMap, setEventParticipantsMap] = useState<Record<number, EventParticipantEntry[]>>({});

    // Proof image & camera
    const [paymentProofImage, setPaymentProofImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [registeredEventSummary, setRegisteredEventSummary] = useState<{ name: string; count: number }[]>([]);

    // Pre-fill donor details if user is logged in
    useEffect(() => {
        if (user) {
            if (user.fullName) setFullName(user.fullName);
            if (user.mobileNumber) setContactNumber(user.mobileNumber);
            if (user.email) setEmail(user.email);
            if (user.towerNumber) setTowerNumber(user.towerNumber);
            if (user.flatNumber) setFlatNumber(user.flatNumber);
        }
    }, [user]);

    const getPrepopulatedValueForField = (
        field: { name?: string; label?: string },
        currentData: {
            fullName: string;
            contactNumber: string;
            email: string;
            towerNumber: string;
            flatNumber: string;
        }
    ): string => {
        const fName = (field.name || '').toLowerCase();
        const fLabel = (field.label || '').toLowerCase();

        if (currentData.towerNumber && (fName.includes('tower') || fLabel.includes('tower'))) {
            return currentData.towerNumber;
        }
        if (currentData.flatNumber && (fName.includes('flat') || fLabel.includes('flat'))) {
            return currentData.flatNumber;
        }
        if (currentData.contactNumber && (
            fName.includes('phone') || fName.includes('mobile') || fName.includes('contact') || 
            fLabel.includes('phone') || fLabel.includes('mobile') || fLabel.includes('contact')
        )) {
            return currentData.contactNumber;
        }
        if (currentData.fullName && (fName.includes('name') || fLabel.includes('name'))) {
            return currentData.fullName;
        }
        if (currentData.email && (fName.includes('email') || fLabel.includes('email'))) {
            return currentData.email;
        }
        return '';
    };

    // Load available public events
    useEffect(() => {
        const loadEvents = async () => {
            setIsLoadingEvents(true);
            setFetchError('');
            try {
                const res = await fetch(`${API_URL}/public/events`);
                if (!res.ok) throw new Error('Failed to load upcoming events');
                const data: PublicEvent[] = await res.json();
                setEvents(data || []);
                // Automatically select all events by default for maximum convenience
                if (data && data.length > 0) {
                    setSelectedEventIds(data.map(e => e.id));
                }
            } catch (err) {
                setFetchError(err instanceof Error ? err.message : 'Unable to fetch events');
            } finally {
                setIsLoadingEvents(false);
            }
        };
        loadEvents();
    }, []);

    // Ensure selected events have at least 1 default participant initialized
    useEffect(() => {
        if (!selectedEventIds || selectedEventIds.length === 0) return;

        setEventParticipantsMap(prev => {
            const next = { ...prev };
            let changed = false;

            selectedEventIds.forEach(evtId => {
                const existingList = next[evtId] || [];
                if (existingList.length === 0) {
                    const evt = events.find(e => e.id === evtId);
                    const defaultP: EventParticipantEntry = {
                        id: 'p-' + Math.random().toString(36).substring(2, 9),
                        name: fullName || '',
                        phone: contactNumber || '',
                        email: email || '',
                    };

                    if (evt && evt.registrationFormSchema) {
                        evt.registrationFormSchema.forEach(field => {
                            const autoVal = getPrepopulatedValueForField(field, { fullName, contactNumber, email, towerNumber, flatNumber });
                            if (autoVal) defaultP[field.name] = autoVal;
                        });
                    }

                    next[evtId] = [defaultP];
                    changed = true;
                } else if (existingList.length === 1 && (!existingList[0].name || existingList[0].name === '')) {
                    // Pre-fill first participant if name was empty and now fullName is available
                    if (fullName) {
                        const updatedP = { ...existingList[0], name: fullName, phone: contactNumber || existingList[0].phone, email: email || existingList[0].email };
                        next[evtId] = [updatedP];
                        changed = true;
                    }
                }
            });

            return changed ? next : prev;
        });
    }, [selectedEventIds, events, fullName, contactNumber, email, towerNumber, flatNumber]);

    const handleAddParticipant = (eventId: number) => {
        const evt = events.find(e => e.id === eventId);
        const newParticipant: EventParticipantEntry = {
            id: 'p-' + Math.random().toString(36).substring(2, 9),
            name: '',
            phone: contactNumber || '',
            email: email || '',
        };

        if (evt && evt.registrationFormSchema) {
            evt.registrationFormSchema.forEach(field => {
                const autoVal = getPrepopulatedValueForField(field, { fullName, contactNumber, email, towerNumber, flatNumber });
                if (autoVal) newParticipant[field.name] = autoVal;
            });
        }

        setEventParticipantsMap(prev => ({
            ...prev,
            [eventId]: [...(prev[eventId] || []), newParticipant]
        }));
    };

    const handleRemoveParticipant = (eventId: number, pIndex: number) => {
        setEventParticipantsMap(prev => {
            const list = [...(prev[eventId] || [])];
            if (list.length <= 1) return prev; // Keep at least 1
            list.splice(pIndex, 1);
            return {
                ...prev,
                [eventId]: list
            };
        });
    };

    const handleUpdateParticipantField = (eventId: number, pIndex: number, fieldName: string, value: any) => {
        setEventParticipantsMap(prev => {
            const list = [...(prev[eventId] || [])];
            if (!list[pIndex]) return prev;
            list[pIndex] = {
                ...list[pIndex],
                [fieldName]: value
            };
            return {
                ...prev,
                [eventId]: list
            };
        });
    };

    const toggleEventSelection = (id: number) => {
        setSelectedEventIds(prev => 
            prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedEventIds.length === events.length) {
            setSelectedEventIds([]);
        } else {
            setSelectedEventIds(events.map(e => e.id));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64String = await compressImageFile(file);
                setPaymentProofImage(base64String);
                setImagePreview(base64String);
            } catch (err) {
                console.error("Error processing proof image:", err);
            }
        }
        e.target.value = '';
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setPaymentProofImage(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSubmitAll = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (selectedEventIds.length === 0) {
            setSubmitError('Please select at least one event to register.');
            window.scrollTo({ top: 200, behavior: 'smooth' });
            return;
        }

        if (!fullName.trim() || !contactNumber.trim()) {
            setSubmitError('Primary Resident Name and Phone Number are required in Step 1.');
            window.scrollTo({ top: 200, behavior: 'smooth' });
            return;
        }

        // Validate participants across all selected events
        for (const evtId of selectedEventIds) {
            const evt = events.find(e => e.id === evtId);
            const evtName = evt ? evt.name : `Event #${evtId}`;
            const pList = eventParticipantsMap[evtId] || [];

            if (pList.length === 0) {
                setSubmitError(`Please add at least one participant for "${evtName}".`);
                window.scrollTo({ top: 400, behavior: 'smooth' });
                return;
            }

            for (let i = 0; i < pList.length; i++) {
                if (!pList[i].name || !pList[i].name.trim()) {
                    setSubmitError(`Please enter the Full Name for Participant #${i + 1} in "${evtName}".`);
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                    return;
                }

                if (evt && evt.registrationFormSchema && Array.isArray(evt.registrationFormSchema)) {
                    for (const field of evt.registrationFormSchema) {
                        if (field.required) {
                            const val = pList[i][field.name] ?? getPrepopulatedValueForField(field, { fullName, contactNumber, email, towerNumber, flatNumber });
                            if (!val || !val.toString().trim()) {
                                setSubmitError(`Please fill in "${field.label}" for Participant #${i + 1} in "${evtName}".`);
                                window.scrollTo({ top: 500, behavior: 'smooth' });
                                return;
                            }
                        }
                    }
                }
            }
        }

        setIsSubmitting(true);

        const formData = {
            name: fullName.trim(),
            phone_number: contactNumber.trim(),
            contact_number: contactNumber.trim(),
            mobile_number: contactNumber.trim(),
            email: email.trim(),
            tower_number: towerNumber.trim(),
            flat_number: flatNumber.trim(),
        };

        // Format participant objects for payload
        const processedParticipantsPayload: Record<number, any[]> = {};
        const summaryList: { name: string; count: number }[] = [];

        selectedEventIds.forEach(evtId => {
            const evt = events.find(e => e.id === evtId);
            const pList = eventParticipantsMap[evtId] || [];

            processedParticipantsPayload[evtId] = pList.map(p => ({
                ...p,
                name: p.name.trim(),
                phone_number: (p.phone || contactNumber).trim(),
                contact_number: (p.phone || contactNumber).trim(),
                email: (p.email || email).trim(),
                tower_number: towerNumber.trim(),
                flat_number: flatNumber.trim()
            }));

            summaryList.push({
                name: evt ? evt.name : `Event #${evtId}`,
                count: pList.length
            });
        });

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/public/events/batch-register`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    eventIds: selectedEventIds,
                    formData,
                    eventParticipants: processedParticipantsPayload,
                    paymentProofImage
                }),
            });

            const resData = await response.json();

            if (!response.ok) {
                throw new Error(resData.error || 'Failed to submit batch registration.');
            }

            setRegisteredEventSummary(summaryList);
            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'An error occurred during registration.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedEventsList = events.filter(e => selectedEventIds.includes(e.id));
    const totalParticipantEntries = selectedEventIds.reduce((sum, evtId) => {
        return sum + (eventParticipantsMap[evtId]?.length || 1);
    }, 0);

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            Registrations Successfully Submitted!
                        </h2>
                        <p className="text-slate-600 text-sm mt-2">
                            You have registered <span className="font-bold text-slate-900">{totalParticipantEntries} participant entry/entries</span> across <span className="font-bold text-slate-900">{registeredEventSummary.length} event(s)</span>.
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Breakdown:</h4>
                        <ul className="space-y-2 text-sm text-slate-800">
                            {registeredEventSummary.map((item, i) => (
                                <li key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="font-semibold text-slate-900 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                                        {item.name}
                                    </span>
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-100">
                                        {item.count} Participant(s)
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        {user ? (
                            <button
                                onClick={() => navigate('/donor-portal')}
                                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md"
                            >
                                Back to My Donor Portal
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/')}
                                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md"
                            >
                                Return to Public Home
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsSuccess(false);
                                setRegisteredEventSummary([]);
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                        >
                            Register More Participants
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header Navbar */}
            <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white font-semibold transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-bold tracking-tight text-white flex items-center justify-center gap-2">
                            <Layers className="w-5 h-5 text-blue-400" /> Multi-Participant Event Registration
                        </h1>
                    </div>
                    <div className="w-16"></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
                {/* Hero Banner */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 max-w-2xl">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
                            <Users className="w-3.5 h-3.5" /> Multiple Entries Per Flat / Family
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Register Multiple Participants across Events
                        </h2>
                        <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                            Select upcoming events and add as many participants from your flat or family as you like. Submit all registrations in one easy step!
                        </p>
                    </div>
                </div>

                {submitError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-start gap-3 shadow-sm">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Registration Alert</p>
                            <p className="mt-0.5 text-xs">{submitError}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmitAll} noValidate className="space-y-8">
                    {/* STEP 1: Resident / Primary Contact Information */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                        <div className="pb-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                1. Flat & Primary Contact Details
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Enter your flat and primary contact information for contribution verification.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Primary Contact / Resident Name <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="e.g. Ramesh Shah"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Primary Phone Number <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                    <input
                                        type="tel"
                                        value={contactNumber}
                                        onChange={e => setContactNumber(e.target.value)}
                                        placeholder="e.g. 9820012345"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Email Address (Optional)
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="e.g. ramesh@example.com"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Tower No.
                                    </label>
                                    <input
                                        type="text"
                                        value={towerNumber}
                                        onChange={e => setTowerNumber(e.target.value)}
                                        placeholder="e.g. T4"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Flat No.
                                    </label>
                                    <input
                                        type="text"
                                        value={flatNumber}
                                        onChange={e => setFlatNumber(e.target.value)}
                                        placeholder="e.g. 1204"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: Event Selection */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    2. Select Events to Join
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Check the box next to each event you want participants from your flat to attend.
                                </p>
                            </div>

                            {events.length > 0 && (
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors self-start sm:self-auto"
                                >
                                    {selectedEventIds.length === events.length ? (
                                        <>
                                            <CheckSquare className="w-4 h-4" /> Deselect All
                                        </>
                                    ) : (
                                        <>
                                            <Square className="w-4 h-4" /> Select All ({events.length})
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {isLoadingEvents ? (
                            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                                <span>Loading upcoming events...</span>
                            </div>
                        ) : fetchError ? (
                            <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-sm border border-amber-200 text-center">
                                {fetchError}
                            </div>
                        ) : events.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-sm">
                                No upcoming events available for registration at this time.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {events.map((evt) => {
                                    const isSelected = selectedEventIds.includes(evt.id);
                                    const pCount = eventParticipantsMap[evt.id]?.length || 1;

                                    return (
                                        <div
                                            key={evt.id}
                                            onClick={() => toggleEventSelection(evt.id)}
                                            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 relative flex flex-col justify-between ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                                                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                                        isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-400'
                                                    }`}>
                                                        {isSelected && <CheckSquare className="w-4 h-4" />}
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 text-base">{evt.name}</h4>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    {isSelected ? `${pCount} Participant${pCount > 1 ? 's' : ''}` : 'Tap to select'}
                                                </span>
                                            </div>

                                            {evt.description && (
                                                <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                                                    {evt.description}
                                                </p>
                                            )}

                                            <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                    {evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : 'TBA'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                                                    {evt.startTime || '18:00'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                    {evt.venue || 'Main Grounds'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* STEP 3: Multiple Participants Per Selected Event */}
                    {selectedEventsList.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                            <div className="pb-4 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    3. Participant Information Per Event
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Add one or multiple participants for each event. You can add family members or friends from your flat!
                                </p>
                            </div>

                            <div className="space-y-8">
                                {selectedEventsList.map(evt => {
                                    const pList = eventParticipantsMap[evt.id] || [];

                                    return (
                                        <div key={evt.id} className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-5">
                                            {/* Event Header in Participant List */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                                                <div>
                                                    <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                                                        {evt.name}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {pList.length} participant(s) configured for this event.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleAddParticipant(evt.id)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
                                                >
                                                    <UserPlus className="w-4 h-4" /> + Add Another Participant
                                                </button>
                                            </div>

                                            {/* List of Participant Cards */}
                                            <div className="space-y-4">
                                                {pList.map((p, pIdx) => {
                                                    return (
                                                        <div 
                                                            key={p.id || pIdx} 
                                                            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative space-y-4 transition-all"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                                                    Participant #{pIdx + 1}
                                                                    {pIdx === 0 && (
                                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-md font-extrabold normal-case">
                                                                            Primary Resident
                                                                        </span>
                                                                    )}
                                                                </span>

                                                                {pList.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveParticipant(evt.id, pIdx)}
                                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                                                                        title="Remove Participant"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {/* Participant Full Name */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                                                        Full Name <span className="text-rose-500">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={p.name || ''}
                                                                        onChange={e => handleUpdateParticipantField(evt.id, pIdx, 'name', e.target.value)}
                                                                        placeholder="e.g. Anaya Shah"
                                                                        required
                                                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                </div>

                                                                {/* Participant Phone Number */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                                                        Phone / Contact No. (Optional)
                                                                    </label>
                                                                    <input
                                                                        type="tel"
                                                                        value={p.phone || ''}
                                                                        onChange={e => handleUpdateParticipantField(evt.id, pIdx, 'phone', e.target.value)}
                                                                        placeholder="e.g. 9820012345"
                                                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                </div>

                                                                {/* Custom Schema Fields for this event (e.g. Age, Category, T-shirt size) */}
                                                                {evt.registrationFormSchema && evt.registrationFormSchema.length > 0 && evt.registrationFormSchema.map((field, fIdx) => {
                                                                    const val = p[field.name] !== undefined 
                                                                        ? p[field.name] 
                                                                        : getPrepopulatedValueForField(field, { fullName, contactNumber, email, towerNumber, flatNumber });

                                                                    return (
                                                                        <div key={fIdx}>
                                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                                                                            </label>
                                                                            {field.type === 'select' ? (
                                                                                <select
                                                                                    value={val || ''}
                                                                                    onChange={e => handleUpdateParticipantField(evt.id, pIdx, field.name, e.target.value)}
                                                                                    required={field.required}
                                                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                                                                                >
                                                                                    <option value="">Select option</option>
                                                                                    {field.options?.split(',').map(opt => (
                                                                                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <input
                                                                                    type={(field.type as string) === 'number' ? 'number' : field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                                                                                    value={val || ''}
                                                                                    onChange={e => handleUpdateParticipantField(evt.id, pIdx, field.name, e.target.value)}
                                                                                    required={field.required}
                                                                                    placeholder={field.label}
                                                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Optional Proof / Verification Upload */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
                        <div className="pb-3 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                Payment / Contribution Verification Proof (Optional)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Attach a receipt or contribution payment screenshot if required for verification.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors">
                                <Upload className="w-4 h-4" /> Choose Image File
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsCameraOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                <Camera className="w-4 h-4 text-blue-600" /> Capture Photo
                            </button>
                            {imagePreview && (
                                <div className="flex items-center gap-2 text-xs text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                                    <CheckCircle2 className="w-4 h-4" /> Image attached
                                </div>
                            )}
                        </div>

                        {imagePreview && (
                            <div className="mt-2 w-32 h-32 rounded-xl border border-slate-200 overflow-hidden relative group">
                                <img src={imagePreview} alt="Proof preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImagePreview(null);
                                        setPaymentProofImage(undefined);
                                    }}
                                    className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Submit Error Alert near button */}
                    {submitError && (
                        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-start gap-3 shadow-md animate-shake">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Cannot Submit Registration</p>
                                <p className="mt-0.5 text-xs">{submitError}</p>
                            </div>
                        </div>
                    )}

                    {/* Submit Bar */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
                        <div>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Ready to Submit?</span>
                            <p className="text-base font-extrabold text-white mt-0.5">
                                Registering {totalParticipantEntries} Participant Entry/Entries across {selectedEventIds.length} Event(s)
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                All participant entries will be submitted and logged under your flat.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || selectedEventIds.length === 0}
                            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-base tracking-wide transition-all duration-200 shadow-xl flex items-center justify-center gap-3 ${
                                isSubmitting || selectedEventIds.length === 0
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:shadow-blue-500/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" /> Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" /> Submit Registrations ({totalParticipantEntries})
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>

            {/* Camera Capture Modal */}
            {isCameraOpen && (
                <CameraCapture
                    onCapture={handleCaptureComplete}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
        </div>
    );
};

export default MultiEventRegistrationPage;
