import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Layers, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, 
    Send, Sparkles, Building2, Users 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import type { PublicEvent } from '../components/RegistrationModal';
import { isEventRegistrationClosed } from '../types/events';

import { 
    EventParticipantEntry, 
    RosterMember, 
    PrimaryContactData 
} from '../components/multi-event/types';
import { PrimaryContactSection } from '../components/multi-event/PrimaryContactSection';
import { EventSelectionGrid } from '../components/multi-event/EventSelectionGrid';
import { EventParticipantForm } from '../components/multi-event/EventParticipantForm';
import { RegistrationSuccessView } from '../components/multi-event/RegistrationSuccessView';

export const MultiEventRegistrationPage: React.FC = () => {

    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string>('');

    // Primary Resident Contact Form Data
    const [primaryContact, setPrimaryContact] = useState<PrimaryContactData>({
        fullName: '',
        contactNumber: '',
        email: '',
        towerNumber: '',
        flatNumber: ''
    });

    // Saved Household Roster from User Profile
    const [familyRoster, setFamilyRoster] = useState<RosterMember[]>([]);

    // Map of eventId -> Array of participants
    const [eventParticipantsMap, setEventParticipantsMap] = useState<Record<number, EventParticipantEntry[]>>({});

    // Feedback state for copy actions
    const [copiedFromEventId, setCopiedFromEventId] = useState<number | null>(null);

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [registeredEventSummary, setRegisteredEventSummary] = useState<{ name: string; count: number }[]>([]);

    // Pre-fill user details and family roster from profile
    useEffect(() => {
        if (user) {
            setPrimaryContact({
                fullName: user.fullName || '',
                contactNumber: user.mobileNumber || '',
                email: user.email || '',
                towerNumber: user.towerNumber || '',
                flatNumber: user.flatNumber || ''
            });

            if (user.familyRoster && Array.isArray(user.familyRoster) && user.familyRoster.length > 0) {
                const formatted: RosterMember[] = user.familyRoster.map((item, idx) => ({
                    id: item.id || (idx === 0 ? 'roster-primary' : 'roster-' + Math.random().toString(36).substring(2, 9)),
                    name: item.name || '',
                    phone: item.phone || '',
                    email: item.email || ''
                }));
                setFamilyRoster(formatted);
            }
        }
    }, [user]);

    // Fetch public upcoming events
    const fetchEvents = async () => {
        setIsLoadingEvents(true);
        setFetchError('');
        try {
            const res = await fetch(`${API_URL}/public/events`);
            if (!res.ok) throw new Error('Failed to load upcoming events');
            const data: PublicEvent[] = await res.json();
            setEvents(data || []);

            // Pre-select all open events by default if available
            if (data && data.length > 0) {
                const openEvents = data.filter(e => !isEventRegistrationClosed(e.registrationDeadline, e.eventDate));
                const initialIds = openEvents.map(e => e.id);
                setSelectedEventIds(initialIds);

                // Initialize participant list with primary contact for each event
                const initialMap: Record<number, EventParticipantEntry[]> = {};
                openEvents.forEach(e => {
                    initialMap[e.id] = [{
                        id: 'p-' + Math.random().toString(36).substring(2, 9),
                        name: user?.fullName || '',
                        phone: user?.mobileNumber || '',
                        email: user?.email || ''
                    }];
                });
                setEventParticipantsMap(initialMap);
            }
        } catch (err) {
            setFetchError(err instanceof Error ? err.message : 'Error fetching events');
        } finally {
            setIsLoadingEvents(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handlePrimaryContactChange = (field: keyof PrimaryContactData, value: string) => {
        setPrimaryContact(prev => ({ ...prev, [field]: value }));
    };

    // Toggle single event selection
    const handleToggleEvent = (eventId: number) => {
        setSelectedEventIds(prev => {
            if (prev.includes(eventId)) {
                return prev.filter(id => id !== eventId);
            } else {
                // If adding event, ensure it has at least 1 default participant
                if (!eventParticipantsMap[eventId] || eventParticipantsMap[eventId].length === 0) {
                    setEventParticipantsMap(pMap => ({
                        ...pMap,
                        [eventId]: [{
                            id: 'p-' + Math.random().toString(36).substring(2, 9),
                            name: primaryContact.fullName,
                            phone: primaryContact.contactNumber,
                            email: primaryContact.email
                        }]
                    }));
                }
                return [...prev, eventId];
            }
        });
    };

    const handleSelectAll = () => {
        const openIds = events.filter(e => !isEventRegistrationClosed(e.registrationDeadline, e.eventDate)).map(e => e.id);
        setSelectedEventIds(openIds);
    };

    const handleDeselectAll = () => {
        setSelectedEventIds([]);
    };

    // Participant management per event
    const handleAddParticipant = (eventId: number) => {
        setEventParticipantsMap(prev => {
            const list = prev[eventId] || [];
            const newP: EventParticipantEntry = {
                id: 'p-' + Math.random().toString(36).substring(2, 9),
                name: '',
                phone: primaryContact.contactNumber,
                email: primaryContact.email
            };
            return { ...prev, [eventId]: [...list, newP] };
        });
    };

    const handleRemoveParticipant = (eventId: number, pIdx: number) => {
        setEventParticipantsMap(prev => {
            const list = prev[eventId] || [];
            if (list.length <= 1) return prev; // Keep at least one
            const updated = list.filter((_, i) => i !== pIdx);
            return { ...prev, [eventId]: updated };
        });
    };

    const handleParticipantChange = (eventId: number, pIdx: number, field: string, value: any) => {
        setEventParticipantsMap(prev => {
            const list = [...(prev[eventId] || [])];
            if (!list[pIdx]) return prev;
            list[pIdx] = { ...list[pIdx], [field]: value };
            return { ...prev, [eventId]: list };
        });
    };

    const handleSelectRosterMember = (eventId: number, pIdx: number, rosterMemberId: string) => {
        const member = familyRoster.find(m => m.id === rosterMemberId);
        if (!member) return;
        setEventParticipantsMap(prev => {
            const list = [...(prev[eventId] || [])];
            if (!list[pIdx]) return prev;
            list[pIdx] = {
                ...list[pIdx],
                name: member.name,
                phone: member.phone || primaryContact.contactNumber,
                email: member.email || primaryContact.email
            };
            return { ...prev, [eventId]: list };
        });
    };

    const handleCopyParticipantsFromEvent = (targetEventId: number, sourceEventId: number) => {
        const sourceList = eventParticipantsMap[sourceEventId] || [];
        if (sourceList.length === 0) return;

        setEventParticipantsMap(prev => ({
            ...prev,
            [targetEventId]: sourceList.map(p => ({
                ...p,
                id: 'p-' + Math.random().toString(36).substring(2, 9)
            }))
        }));

        setCopiedFromEventId(targetEventId);
        setTimeout(() => setCopiedFromEventId(null), 3000);
    };

    // Apply saved household roster across all selected events
    const handleApplyHouseholdRosterToAllEvents = () => {
        const validMembers = familyRoster.filter(m => m.name.trim() !== '');
        if (validMembers.length === 0) return;

        setEventParticipantsMap(prev => {
            const nextMap = { ...prev };
            selectedEventIds.forEach(evtId => {
                nextMap[evtId] = validMembers.map(m => ({
                    id: 'p-' + Math.random().toString(36).substring(2, 9),
                    name: m.name,
                    phone: m.phone || primaryContact.contactNumber,
                    email: m.email || primaryContact.email
                }));
            });
            return nextMap;
        });
    };

    // Batch Registration Submission
    const handleSubmitBatchRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!primaryContact.fullName.trim() || !primaryContact.contactNumber.trim()) {
            setSubmitError('Please fill in Primary Resident Name and Mobile Number.');
            return;
        }

        if (selectedEventIds.length === 0) {
            setSubmitError('Please select at least one event to register for.');
            return;
        }

        // Check if any selected event is closed
        for (const evtId of selectedEventIds) {
            const evt = events.find(e => e.id === evtId);
            if (evt && isEventRegistrationClosed(evt.registrationDeadline, evt.eventDate)) {
                setSubmitError(`Registration for "${evt.name}" is now closed. Please unselect it.`);
                return;
            }
        }

        // Validate each participant in selected events
        for (const evtId of selectedEventIds) {
            const evt = events.find(e => e.id === evtId);
            const evtName = evt ? evt.name : `Event #${evtId}`;
            const pList = eventParticipantsMap[evtId] || [];

            if (pList.length === 0) {
                setSubmitError(`Please add at least one participant for "${evtName}".`);
                return;
            }

            for (let i = 0; i < pList.length; i++) {
                if (!pList[i].name || !pList[i].name.trim()) {
                    setSubmitError(`Please enter Full Name for Participant #${i + 1} in "${evtName}".`);
                    return;
                }

                if (evt && evt.registrationFormSchema && Array.isArray(evt.registrationFormSchema)) {
                    for (const field of evt.registrationFormSchema) {
                        if (field.required) {
                            const val = pList[i][field.name];
                            if (!val || !val.toString().trim()) {
                                setSubmitError(`Please fill in "${field.label}" for Participant #${i + 1} in "${evtName}".`);
                                return;
                            }
                        }
                    }
                }
            }
        }

        setIsSubmitting(true);

        const formData = {
            name: primaryContact.fullName.trim(),
            phone_number: primaryContact.contactNumber.trim(),
            contact_number: primaryContact.contactNumber.trim(),
            mobile_number: primaryContact.contactNumber.trim(),
            email: primaryContact.email.trim(),
            tower_number: primaryContact.towerNumber.trim(),
            flat_number: primaryContact.flatNumber.trim(),
        };

        const processedParticipantsPayload: Record<number, any[]> = {};
        const summaryList: { name: string; count: number }[] = [];

        selectedEventIds.forEach(evtId => {
            const evt = events.find(e => e.id === evtId);
            const pList = eventParticipantsMap[evtId] || [];

            processedParticipantsPayload[evtId] = pList.map(p => ({
                ...p,
                name: p.name.trim(),
                phone_number: (p.phone || primaryContact.contactNumber).trim(),
                contact_number: (p.phone || primaryContact.contactNumber).trim(),
                email: (p.email || primaryContact.email).trim(),
                tower_number: primaryContact.towerNumber.trim(),
                flat_number: primaryContact.flatNumber.trim()
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
                    eventParticipants: processedParticipantsPayload
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

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <RegistrationSuccessView 
                    registeredEventSummary={registeredEventSummary}
                    onReset={() => {
                        setIsSuccess(false);
                        fetchEvents();
                    }}
                />
            </div>
        );
    }

    const selectedEventsList = events.filter(e => selectedEventIds.includes(e.id));
    const totalParticipantsCount = selectedEventIds.reduce((sum, id) => sum + (eventParticipantsMap[id]?.length || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Navbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/donor-portal')}
                            className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-sm transition-colors cursor-pointer"
                            title="Return to Donor Portal"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                Multi-Event Registration
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select multiple festival events and register your household members in one single checkout.
                            </p>
                        </div>
                    </div>

                    {familyRoster.length > 0 && (
                        <button
                            type="button"
                            onClick={handleApplyHouseholdRosterToAllEvents}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4 text-amber-300" /> Auto-fill Household Roster to All Events
                        </button>
                    )}
                </div>

                {fetchError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <span>{fetchError}</span>
                        </div>
                        <button
                            onClick={fetchEvents}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-lg transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {isLoadingEvents ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm font-semibold text-slate-600">Loading upcoming events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-800">No active events found</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            There are currently no active public events open for multi-event registration.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitBatchRegistration} className="space-y-6">
                        {/* Step 1: Primary Resident Details */}
                        <PrimaryContactSection
                            contactData={primaryContact}
                            onChange={handlePrimaryContactChange}
                            familyRoster={familyRoster}
                            isLoggedIn={!!user}
                        />

                        {/* Step 2: Event Selection Grid */}
                        <EventSelectionGrid
                            events={events}
                            selectedEventIds={selectedEventIds}
                            onToggleEvent={handleToggleEvent}
                            onSelectAll={handleSelectAll}
                            onDeselectAll={handleDeselectAll}
                            eventParticipantsMap={eventParticipantsMap}
                        />

                        {/* Step 3: Per-Event Participant Entry Forms */}
                        {selectedEventsList.length > 0 && (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-600" /> Participant Forms ({selectedEventsList.length} Events Selected)
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-500">
                                        Total Participants: <strong className="text-blue-700">{totalParticipantsCount}</strong>
                                    </span>
                                </div>

                                {selectedEventsList.map(evt => (
                                    <EventParticipantForm
                                        key={evt.id}
                                        event={evt}
                                        participants={eventParticipantsMap[evt.id] || []}
                                        allSelectedEvents={selectedEventsList}
                                        familyRoster={familyRoster}
                                        primaryContact={primaryContact}
                                        onAddParticipant={handleAddParticipant}
                                        onRemoveParticipant={handleRemoveParticipant}
                                        onParticipantChange={handleParticipantChange}
                                        onSelectRosterMember={handleSelectRosterMember}
                                        onCopyParticipantsFromEvent={handleCopyParticipantsFromEvent}
                                        onApplyHouseholdRosterToAllEvents={handleApplyHouseholdRosterToAllEvents}
                                        copiedFromEventId={copiedFromEventId}
                                    />
                                ))}
                            </div>
                        )}

                        {submitError && (
                            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        {/* Submit Floating Action Bar */}
                        <div className="sticky bottom-6 bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 z-30">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Registration Summary</p>
                                <p className="text-sm font-bold text-white mt-0.5">
                                    {selectedEventIds.length} Event{selectedEventIds.length !== 1 ? 's' : ''} Selected ({totalParticipantsCount} Total Participant{totalParticipantsCount !== 1 ? 's' : ''})
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => navigate('/donor-portal')}
                                    className="w-1/2 sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || selectedEventIds.length === 0}
                                    className="w-1/2 sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting ? 'Submitting Registrations...' : 'Confirm & Register All'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default MultiEventRegistrationPage;
