import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Event, EventRegistration, RegistrationFormField, Festival } from '../../types/index';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { API_URL } from '../../config';
import { formatUTCDate } from '../../utils/formatting';
import { exportToCsv } from '../../utils/exportUtils';
import ImageViewerModal from '../ImageViewerModal';
import { DeleteIcon } from '../icons/DeleteIcon';
import { 
    Calendar, 
    Users, 
    Clock, 
    MapPin, 
    Search, 
    Loader2, 
    FileSpreadsheet, 
    ArrowUpDown, 
    CheckCircle2,
    CalendarDays,
    ChevronDown,
    Check,
    X,
    Filter,
    Layers
} from 'lucide-react';

interface EventDetails {
    name: string;
    festivalId: number;
    festivalName?: string;
    venue?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    isGroupEvent?: boolean;
    minGroupSize?: number;
    maxGroupSize?: number;
    registrationFormSchema: RegistrationFormField[];
}

interface EnhancedEventRegistration extends EventRegistration {
    eventId: number;
    eventName: string;
    eventVenue?: string;
    eventStartTime?: string;
    eventEndTime?: string;
    isGroupEvent?: boolean;
}

interface EventParticipantsByDateTabProps {
    festivals: Festival[];
    selectedFestivalId: string;
}

export const EventParticipantsByDateTab: React.FC<EventParticipantsByDateTabProps> = ({
    festivals,
    selectedFestivalId,
}) => {
    const { token, logout, hasPermission } = useAuth();
    const { openConfirmationModal } = useModal();

    const [events, setEvents] = useState<Event[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [eventsError, setEventsError] = useState('');

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
    const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
    const eventDropdownRef = useRef<HTMLDivElement>(null);

    const [registrations, setRegistrations] = useState<EnhancedEventRegistration[]>([]);
    const [eventsDetailsMap, setEventsDetailsMap] = useState<Record<string, EventDetails>>({});
    const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
    const [registrationError, setRegistrationError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target as Node)) {
                setIsEventDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch all events
    const fetchEvents = useCallback(async () => {
        if (!token) return;
        setIsLoadingEvents(true);
        setEventsError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_URL}/events`, { headers });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to fetch events');
            const data: Event[] = await response.json();
            setEvents(data);
        } catch (err) {
            setEventsError(err instanceof Error ? err.message : 'Failed to fetch events');
        } finally {
            setIsLoadingEvents(false);
        }
    }, [token, logout]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Filter events by selected festival if applicable
    const filteredEvents = useMemo(() => {
        if (selectedFestivalId === 'all') return events;
        return events.filter(e => String(e.festivalId) === String(selectedFestivalId));
    }, [events, selectedFestivalId]);

    // Extract unique scheduled dates sorted chronologically
    const scheduledDates = useMemo(() => {
        const dateMap = new Map<string, Event[]>();
        filteredEvents.forEach(e => {
            if (e.eventDate) {
                const dateKey = e.eventDate.includes('T') ? e.eventDate.split('T')[0] : e.eventDate;
                if (!dateMap.has(dateKey)) {
                    dateMap.set(dateKey, []);
                }
                dateMap.get(dateKey)!.push(e);
            }
        });

        // Sort dates chronologically ascending (earliest scheduled date first)
        const sortedDateKeys = Array.from(dateMap.keys()).sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );

        return sortedDateKeys.map(dateKey => ({
            date: dateKey,
            events: dateMap.get(dateKey) || [],
        }));
    }, [filteredEvents]);

    // Auto-select first date when scheduledDates change or if current selectedDate is invalid
    useEffect(() => {
        if (scheduledDates.length > 0) {
            const dateExists = scheduledDates.some(d => d.date === selectedDate);
            if (!dateExists) {
                setSelectedDate(scheduledDates[0].date);
            }
        } else {
            setSelectedDate('');
            setSelectedEventIds([]);
            setRegistrations([]);
            setEventsDetailsMap({});
        }
    }, [scheduledDates, selectedDate]);

    // Events scheduled on the selected date
    const eventsOnSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        const match = scheduledDates.find(d => d.date === selectedDate);
        return match ? match.events : [];
    }, [scheduledDates, selectedDate]);

    // Auto-select all events on that date when selectedDate or eventsOnSelectedDate change
    useEffect(() => {
        if (eventsOnSelectedDate.length > 0) {
            // Default to selecting all events for this date
            const allIds = eventsOnSelectedDate.map(e => String(e.id));
            setSelectedEventIds(allIds);
        } else {
            setSelectedEventIds([]);
            setRegistrations([]);
            setEventsDetailsMap({});
        }
    }, [eventsOnSelectedDate, selectedDate]);

    // Fetch registrations for all selected events
    const fetchRegistrationsForSelectedEvents = useCallback(async () => {
        if (selectedEventIds.length === 0 || !token) {
            setRegistrations([]);
            setEventsDetailsMap({});
            return;
        }

        setIsLoadingRegistrations(true);
        setRegistrationError('');

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const detailsMap: Record<string, EventDetails> = {};
            const combinedRegistrations: EnhancedEventRegistration[] = [];

            // Fetch registration data for each selected event in parallel
            const fetchPromises = selectedEventIds.map(async (eventId) => {
                const eventObj = events.find(e => String(e.id) === String(eventId));
                const response = await fetch(`${API_URL}/events/${eventId}/registrations`, { headers });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                if (!response.ok) {
                    throw new Error(`Failed to fetch registrations for event ID ${eventId}`);
                }

                const data = await response.json();
                const fetchedEvent: EventDetails = data.event || {
                    name: eventObj?.name || `Event #${eventId}`,
                    festivalId: eventObj?.festivalId || 0,
                    registrationFormSchema: eventObj?.registrationFormSchema || [],
                    venue: eventObj?.venue,
                    eventDate: eventObj?.eventDate,
                    startTime: eventObj?.startTime || undefined,
                    endTime: eventObj?.endTime || undefined,
                    isGroupEvent: eventObj?.isGroupEvent,
                };

                detailsMap[eventId] = fetchedEvent;

                const eventRegs: EventRegistration[] = data.registrations || [];
                eventRegs.forEach(reg => {
                    combinedRegistrations.push({
                        ...reg,
                        eventId: Number(eventId),
                        eventName: fetchedEvent.name || eventObj?.name || 'Event',
                        eventVenue: fetchedEvent.venue || eventObj?.venue,
                        eventStartTime: fetchedEvent.startTime || eventObj?.startTime || undefined,
                        eventEndTime: fetchedEvent.endTime || eventObj?.endTime || undefined,
                        isGroupEvent: fetchedEvent.isGroupEvent ?? eventObj?.isGroupEvent,
                    });
                });
            });

            await Promise.all(fetchPromises);

            setEventsDetailsMap(detailsMap);
            setRegistrations(combinedRegistrations);
        } catch (err) {
            setRegistrationError(err instanceof Error ? err.message : 'Failed to fetch registrations');
        } finally {
            setIsLoadingRegistrations(false);
        }
    }, [selectedEventIds, token, logout, events]);

    useEffect(() => {
        fetchRegistrationsForSelectedEvents();
    }, [fetchRegistrationsForSelectedEvents]);

    // Handle toggling single event selection
    const handleToggleEvent = (eventIdStr: string) => {
        setSelectedEventIds(prev => {
            if (prev.includes(eventIdStr)) {
                return prev.filter(id => id !== eventIdStr);
            } else {
                return [...prev, eventIdStr];
            }
        });
    };

    // Handle Select All events for current date
    const handleSelectAllEvents = () => {
        setSelectedEventIds(eventsOnSelectedDate.map(e => String(e.id)));
    };

    // Handle Deselect All events
    const handleDeselectAllEvents = () => {
        setSelectedEventIds([]);
    };

    // Sort participants in CHRONOLOGICAL order (registered first = first in list)
    const chronologicalRegistrations = useMemo(() => {
        const sorted = [...registrations].sort((a, b) => {
            const timeA = new Date(a.submittedAt).getTime();
            const timeB = new Date(b.submittedAt).getTime();
            return timeA - timeB; // Ascending order: earliest registration first
        });

        if (!searchTerm.trim()) return sorted;

        const term = searchTerm.toLowerCase();
        return sorted.filter(r => {
            if (r.name && r.name.toLowerCase().includes(term)) return true;
            if (r.email && r.email.toLowerCase().includes(term)) return true;
            if (r.eventName && r.eventName.toLowerCase().includes(term)) return true;
            if (r.formData) {
                return Object.values(r.formData).some(val => {
                    if (typeof val === 'string') return val.toLowerCase().includes(term);
                    if (typeof val === 'number') return String(val).includes(term);
                    if (Array.isArray(val)) {
                        return val.some(member => 
                            typeof member === 'string' ? member.toLowerCase().includes(term) :
                            (member?.name && member.name.toLowerCase().includes(term)) ||
                            (member?.phone && member.phone.includes(term))
                        );
                    }
                    return false;
                });
            }
            return false;
        });
    }, [registrations, searchTerm]);

    const isSingleEventSelected = selectedEventIds.length === 1;
    const singleEventDetails = isSingleEventSelected ? eventsDetailsMap[selectedEventIds[0]] : null;

    // Helper to get phone number from registration
    const getPhoneNumber = (reg: EnhancedEventRegistration): string => {
        if (reg.formData) {
            const phone = reg.formData.phone_number || reg.formData.phoneNumber || reg.formData.mobile_number || reg.formData.phone || reg.formData.contact_number;
            if (phone) return String(phone);
        }
        return '';
    };

    // Helper to get tower number from registration
    const getTowerNumber = (reg: EnhancedEventRegistration): string => {
        if (reg.formData) {
            const tower = reg.formData.tower_number || reg.formData.towerNumber || reg.formData.tower || reg.formData.building;
            if (tower) return String(tower);
        }
        return '';
    };

    // Helper to get flat number from registration
    const getFlatNumber = (reg: EnhancedEventRegistration): string => {
        if (reg.formData) {
            const flat = reg.formData.flat_number || reg.formData.flatNumber || reg.formData.flat || reg.formData.unit;
            if (flat) return String(flat);
        }
        return '';
    };

    // Find common schema fields if multiple events are selected
    const commonSchemaFields = useMemo(() => {
        if (selectedEventIds.length <= 1) return [];

        const selectedSchemas = selectedEventIds
            .map(id => eventsDetailsMap[id]?.registrationFormSchema || [])
            .filter(schema => schema.length > 0);

        if (selectedSchemas.length === 0) return [];

        // Find field names present across all selected events
        const firstSchema = selectedSchemas[0];
        const sharedFields: RegistrationFormField[] = [];

        firstSchema.forEach(field => {
            const fieldName = field.name.toLowerCase();
            // Skip basic fields that are handled standardly
            if (['name', 'email', 'phone_number', 'phonenumber', 'phone', 'mobile_number', 'tower_number', 'tower', 'flat_number', 'flat'].includes(fieldName)) {
                return;
            }

            const presentInAll = selectedSchemas.every(schema => 
                schema.some(f => f.name.toLowerCase() === fieldName)
            );

            if (presentInAll) {
                sharedFields.push(field);
            }
        });

        return sharedFields;
    }, [selectedEventIds, eventsDetailsMap]);

    // Table Headers generated dynamically based on single vs multiple event selection
    const tableHeaders = useMemo(() => {
        const headers = new Map<string, string>();
        headers.set('registrationOrder', '#');
        headers.set('name', 'Full Name');

        if (isSingleEventSelected && singleEventDetails) {
            // SINGLE EVENT: Display all fields from that event's schema
            (singleEventDetails.registrationFormSchema || []).forEach(field => {
                if (field.name !== 'name') {
                    headers.set(field.name, field.label);
                }
            });
        } else {
            // MULTIPLE EVENTS: Display Event column + Common fields
            headers.set('eventName', 'Event');
            headers.set('phone_number', 'Phone Number');
            headers.set('tower_flat', 'Tower / Flat');
            headers.set('email', 'Email');

            // Add any additional schema fields common to all selected events
            commonSchemaFields.forEach(field => {
                if (!headers.has(field.name)) {
                    headers.set(field.name, field.label);
                }
            });
        }

        headers.set('paymentProofImage', 'Payment Proof');
        headers.set('submittedAt', 'Registered On');

        return Array.from(headers.entries()).map(([key, label]) => ({ key, label }));
    }, [isSingleEventSelected, singleEventDetails, commonSchemaFields]);

    const handleDelete = useCallback((registrationId: number) => {
        const onDeleteSuccess = () => {
            setRegistrations(prev => prev.filter(r => r.id !== registrationId));
        };
        openConfirmationModal(registrationId, 'event-registrations', onDeleteSuccess);
    }, [openConfirmationModal]);

    const getDisplayValue = (
        registration: EnhancedEventRegistration, 
        key: string, 
        orderIndex: number, 
        forExport = false
    ): React.ReactNode => {
        if (key === 'registrationOrder') {
            if (forExport) return orderIndex + 1;
            return (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                    {orderIndex + 1}
                </span>
            );
        }

        if (key === 'submittedAt') {
            return formatUTCDate(registration.submittedAt, { dateStyle: 'medium', timeStyle: 'short' });
        }

        if (key === 'name') return registration.name || 'N/A';
        if (key === 'email') return registration.email || (registration.formData && registration.formData.email) || 'N/A';

        if (key === 'eventName') {
            if (forExport) return registration.eventName;
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    {registration.eventName}
                </span>
            );
        }

        if (key === 'phone_number' || key === 'phoneNumber') {
            const phone = getPhoneNumber(registration);
            return phone || (forExport ? '' : 'N/A');
        }

        if (key === 'tower_flat') {
            const tower = getTowerNumber(registration);
            const flat = getFlatNumber(registration);
            if (!tower && !flat) return forExport ? '' : 'N/A';
            const text = [tower ? `T-${tower}` : '', flat ? `F-${flat}` : ''].filter(Boolean).join(', ') || `${tower || ''} ${flat || ''}`.trim();
            return text || (forExport ? '' : 'N/A');
        }

        if (key === 'paymentProofImage') {
            if (!registration.paymentProofImage) return forExport ? 'No' : 'N/A';
            if (forExport) return 'Yes';
            return (
                <img
                    src={registration.paymentProofImage}
                    alt="Payment proof"
                    className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform border border-slate-200"
                    onClick={() => setViewingImage(registration.paymentProofImage!)}
                />
            );
        }

        const value = registration.formData ? registration.formData[key] : undefined;
        if (typeof value === 'boolean') {
            if (forExport) return value ? 'Yes' : 'No';
            return value ? '✔️' : '❌';
        }

        // Handle group members array
        if (key === 'group_members' || key === 'groupMembers' || key === 'members') {
            const members = Array.isArray(value) ? value : [];
            if (members.length === 0) return forExport ? 'None' : '-';
            if (forExport) {
                return members.map(m => (typeof m === 'string' ? m : `${m.name}${m.phone ? ` (${m.phone})` : ''}`)).join('; ');
            }
            return (
                <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                        {members.length} Member{members.length !== 1 ? 's' : ''}
                    </span>
                    <ul className="text-xs text-slate-600 list-disc list-inside">
                        {members.map((m, mIdx) => (
                            <li key={mIdx}>
                                {typeof m === 'string' ? m : `${m.name} ${m.phone ? `(${m.phone})` : ''}`}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        // Handle Audio / File uploads
        const filename = registration.formData ? registration.formData[`${key}_filename`] : '';
        const currentEventDetail = eventsDetailsMap[registration.eventId];
        const fieldSchema = currentEventDetail?.registrationFormSchema?.find(f => f.name === key);
        
        const isAudio =
            (fieldSchema && fieldSchema.type === 'audio') ||
            (typeof value === 'string' && value.startsWith('data:audio')) ||
            key.toLowerCase().includes('audio') ||
            key.toLowerCase().includes('song') ||
            key.toLowerCase().includes('track') ||
            key.toLowerCase().includes('music') ||
            (Boolean(filename) && /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(filename));

        const isFile =
            (fieldSchema && fieldSchema.type === 'file') ||
            (typeof value === 'string' && (value.startsWith('data:') || value.startsWith('/api/event-registrations/') || value.includes('/files/'))) ||
            key.toLowerCase().includes('file') ||
            key.toLowerCase().includes('attachment') ||
            Boolean(filename);

        if (typeof value === 'string' && value && isAudio) {
            const trackName = filename || `${key}.mp3`;
            if (forExport) return trackName;
            return (
                <div className="flex items-center gap-2">
                    <audio controls className="h-8 max-w-[190px]" src={value}>
                        Your browser does not support audio.
                    </audio>
                    <a
                        href={value}
                        download={trackName}
                        className="text-xs text-blue-600 hover:underline shrink-0 font-medium"
                        title="Download track"
                    >
                        Download
                    </a>
                </div>
            );
        }

        if (typeof value === 'string' && value && isFile) {
            const docName = filename || (value.startsWith('/api/') ? 'Attachment' : 'Uploaded File');
            if (forExport) return docName;
            return (
                <a
                    href={value}
                    download={docName}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                    📁 Download {docName}
                </a>
            );
        }

        return value || 'N/A';
    };

    const handleExport = () => {
        if (chronologicalRegistrations.length === 0) return;

        const dataToExport = chronologicalRegistrations.map((r, index) => {
            const row: Record<string, any> = {};
            tableHeaders.forEach(header => {
                const value = getDisplayValue(r, header.key, index, true);
                row[header.label] = value;
            });
            return row;
        });

        const safeDate = selectedDate ? selectedDate.replace(/[^a-zA-Z0-9_-]/g, '_') : 'date';
        let filename = `participants_${safeDate}_chronological`;
        if (isSingleEventSelected && singleEventDetails) {
            filename = `participants_${safeDate}_${singleEventDetails.name.replace(/\s+/g, '_')}_chronological`;
        } else if (selectedEventIds.length > 1) {
            filename = `participants_${safeDate}_multiple_events_chronological`;
        }

        exportToCsv(dataToExport, filename);
    };

    const canDelete = hasPermission('action:delete');

    // Display summary text for event selector
    const getEventDropdownTriggerText = () => {
        if (eventsOnSelectedDate.length === 0) return 'No events on this date';
        if (selectedEventIds.length === 0) return 'Select events...';
        if (selectedEventIds.length === eventsOnSelectedDate.length) {
            if (eventsOnSelectedDate.length === 1) {
                return eventsOnSelectedDate[0].name;
            }
            return `All Events Selected (${eventsOnSelectedDate.length})`;
        }
        if (selectedEventIds.length === 1) {
            const matched = eventsOnSelectedDate.find(e => String(e.id) === selectedEventIds[0]);
            return matched ? matched.name : '1 Event Selected';
        }
        return `${selectedEventIds.length} Events Selected`;
    };

    return (
        <div className="space-y-6">
            {viewingImage && <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}

            {/* Date & Multi-Event Selection Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Select Scheduled Event Date</h3>
                            <p className="text-xs text-slate-500">
                                Select single or multiple events for the chosen date to view common participant data in chronological order.
                            </p>
                        </div>
                    </div>

                    {scheduledDates.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-full shadow-2xs self-start sm:self-auto">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {scheduledDates.length} Scheduled Date{scheduledDates.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1) Scheduled Date Dropdown */}
                    <div>
                        <label htmlFor="scheduled-date-select" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Event Scheduled Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                id="scheduled-date-select"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                disabled={isLoadingEvents || scheduledDates.length === 0}
                                className="w-full pl-3.5 pr-10 py-2.5 text-sm font-medium border border-slate-300 bg-white rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60 cursor-pointer"
                            >
                                {scheduledDates.length === 0 ? (
                                    <option value="">{isLoadingEvents ? 'Loading scheduled dates...' : 'No scheduled event dates found'}</option>
                                ) : (
                                    scheduledDates.map(item => {
                                        const formattedDate = formatUTCDate(item.date, { 
                                            weekday: 'short', 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                        });
                                        const eventCount = item.events.length;
                                        const eventNamesPreview = item.events.map(e => e.name).join(', ');
                                        return (
                                            <option key={item.date} value={item.date}>
                                                {formattedDate} — ({eventCount} event{eventCount !== 1 ? 's' : ''}: {eventNamesPreview})
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                        </div>
                    </div>

                    {/* 2) Multi-Select Event Dropdown */}
                    <div className="relative" ref={eventDropdownRef}>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Select Events on Date <span className="text-red-500">*</span>
                            {eventsOnSelectedDate.length > 1 && (
                                <span className="text-blue-600 font-normal ml-1 lowercase">({eventsOnSelectedDate.length} available)</span>
                            )}
                        </label>
                        
                        {/* Dropdown Trigger Button */}
                        <button
                            type="button"
                            id="scheduled-events-multi-select-btn"
                            onClick={() => setIsEventDropdownOpen(prev => !prev)}
                            disabled={isLoadingEvents || eventsOnSelectedDate.length === 0}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium border border-slate-300 bg-white rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60 cursor-pointer transition-all text-left"
                            aria-haspopup="listbox"
                            aria-expanded={isEventDropdownOpen}
                        >
                            <span className="truncate flex items-center gap-2">
                                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className={selectedEventIds.length === 0 ? 'text-slate-400' : 'text-slate-800 font-semibold'}>
                                    {getEventDropdownTriggerText()}
                                </span>
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${isEventDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu Popover */}
                        {isEventDropdownOpen && (
                            <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2 max-h-80 overflow-y-auto">
                                {/* Quick action buttons */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1 text-xs">
                                    <span className="font-semibold text-slate-500">
                                        {selectedEventIds.length} of {eventsOnSelectedDate.length} selected
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllEvents}
                                            className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllEvents}
                                            className="text-slate-500 hover:text-slate-700 font-medium hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                {/* Event Checkbox List */}
                                <div className="space-y-1.5 pt-1">
                                    {eventsOnSelectedDate.map(evt => {
                                        const isChecked = selectedEventIds.includes(String(evt.id));
                                        return (
                                            <label
                                                key={evt.id}
                                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                                                    isChecked ? 'bg-blue-50/70 border border-blue-200/60' : 'hover:bg-slate-50 border border-transparent'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleEvent(String(evt.id))}
                                                    className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="text-sm font-semibold text-slate-900 truncate">
                                                            {evt.name}
                                                        </span>
                                                        {evt.registrationCount !== undefined && (
                                                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">
                                                                {evt.registrationCount} registered
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                        {evt.startTime && (
                                                            <span>⏰ {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''}</span>
                                                        )}
                                                        {evt.venue && (
                                                            <span>📍 {evt.venue}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3) Quick Search within Event Participants */}
                    <div>
                        <label htmlFor="event-participant-search" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Filter Attendees In Event(s)
                        </label>
                        <div className="relative">
                            <input
                                id="event-participant-search"
                                type="text"
                                placeholder="Search by name, event, phone, details..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Selected Events Chips & Metadata Bar */}
                {selectedEventIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Active Events:
                        </span>
                        {selectedEventIds.map(id => {
                            const evt = events.find(e => String(e.id) === String(id));
                            if (!evt) return null;
                            return (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                                >
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span>{evt.name}</span>
                                    {evt.startTime && (
                                        <span className="text-slate-400 text-[11px]">({evt.startTime})</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleEvent(String(id))}
                                        className="text-slate-400 hover:text-slate-600 ml-0.5"
                                        title="Remove this event from selection"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Content / Table Section */}
            {isLoadingEvents ? (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Loading scheduled event dates...</span>
                </div>
            ) : eventsError ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
                    {eventsError}
                </div>
            ) : scheduledDates.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-700">No Scheduled Events Found</p>
                    <p className="text-xs text-slate-500 mt-1">There are no events with scheduled dates in the selected festival.</p>
                </div>
            ) : selectedEventIds.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                    <Filter className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-700">No Events Selected</p>
                    <p className="text-xs text-slate-500 mt-1">Please select one or more events from the dropdown above to view registered participants.</p>
                </div>
            ) : isLoadingRegistrations ? (
                <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="font-medium text-slate-700">
                        Loading registrations for {selectedEventIds.length} selected event{selectedEventIds.length !== 1 ? 's' : ''}...
                    </span>
                </div>
            ) : registrationError ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
                    {registrationError}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Header bar with Count and Chronological indicator */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-slate-800">
                                {chronologicalRegistrations.length} Participant{chronologicalRegistrations.length !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ArrowUpDown className="w-3 h-3" />
                                Chronological Order (First Registered First)
                            </span>
                            {selectedEventIds.length > 1 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Layers className="w-3 h-3" />
                                    Combined Common Data ({selectedEventIds.length} Events)
                                </span>
                            )}
                        </div>

                        <button
                            id="export-chronological-event-csv"
                            onClick={handleExport}
                            disabled={chronologicalRegistrations.length === 0}
                            className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="Export attendees in chronological order to CSV"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Export Event Registrations (CSV)</span>
                        </button>
                    </div>

                    {/* Table displaying the common data in chronological order */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs bg-white">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/90">
                                <tr>
                                    {tableHeaders.map(header => (
                                        <th
                                            key={header.key}
                                            scope="col"
                                            className={`px-5 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider ${
                                                header.key === 'registrationOrder' ? 'text-center w-12' : 'text-left'
                                            }`}
                                        >
                                            {header.label}
                                        </th>
                                    ))}
                                    {canDelete && (
                                        <th scope="col" className="px-5 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {chronologicalRegistrations.map((reg, index) => {
                                    const participantPhone = getPhoneNumber(reg) || 'none';
                                    return (
                                        <tr key={`${reg.eventId}-${reg.id}`} className="hover:bg-slate-50/80 transition-colors">
                                            {tableHeaders.map(header => (
                                                <td
                                                    key={header.key}
                                                    className={`px-5 py-4 whitespace-nowrap text-sm text-slate-600 ${
                                                        header.key === 'registrationOrder' ? 'text-center' : ''
                                                    } ${header.key === 'name' ? 'font-semibold text-slate-900' : ''}`}
                                                >
                                                    {header.key === 'name' ? (
                                                        <Link
                                                            to={`/participants/${encodeURIComponent(reg.name)}/${encodeURIComponent(participantPhone)}`}
                                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            {reg.name}
                                                        </Link>
                                                    ) : (
                                                        getDisplayValue(reg, header.key, index)
                                                    )}
                                                </td>
                                            ))}
                                            {canDelete && (
                                                <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleDelete(reg.id)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Registration"
                                                    >
                                                        <DeleteIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {chronologicalRegistrations.length === 0 && (
                            <div className="text-center py-16 text-slate-500">
                                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                <p className="font-semibold text-slate-700">No Registrations Found</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {searchTerm ? 'No participants match your filter criteria.' : 'No one has registered for the selected events on this date yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventParticipantsByDateTab;
