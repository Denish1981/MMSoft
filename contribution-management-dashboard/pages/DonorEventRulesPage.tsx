import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, MapPin, Search, Filter, BookOpen, 
    ArrowLeft, Eye, Sparkles, AlertCircle, CheckCircle2, 
    RefreshCw, Layers, Users, ChevronRight, Share2, Tag,
    HelpCircle, Download
} from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { formatUTCDate } from '../utils/formatting';
import { isEventRegistrationClosed } from '../types/events';
import { EventRulesRenderer } from '../components/event-rules/EventRulesRenderer';
import { EventRulesDetailsModal } from '../components/EventRulesDetailsModal';
import { parseEventRules } from '../utils/ruleUtils';
import type { PublicEvent } from '../components/RegistrationModal';

export const DonorEventRulesPage: React.FC = () => {
    const navigate = useNavigate();
    const { token, logout, user, isAuthenticated } = useAuth();
    
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedFestivalFilter, setSelectedFestivalFilter] = useState<string>('all');
    const [selectedRulesFilter, setSelectedRulesFilter] = useState<'all' | 'with-rules' | 'open-registration'>('all');
    const [selectedEventForModal, setSelectedEventForModal] = useState<PublicEvent | null>(null);
    const [expandedRules, setExpandedRules] = useState<Record<number, boolean>>({});

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Fetch all events
            const res = await fetch(`${API_URL}/public/events`, { headers });
            if (res.status === 401) {
                logout();
                return;
            }
            if (!res.ok) {
                throw new Error('Failed to fetch festival events');
            }
            const data: PublicEvent[] = await res.json();
            setEvents(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while loading events');
        } finally {
            setIsLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Unique festivals list for dropdown filter
    const festivalOptions = useMemo(() => {
        const unique = new Map<string, string>();
        events.forEach(e => {
            const fName = e.festivalName || 'General';
            unique.set(fName, fName);
        });
        return Array.from(unique.values()).sort();
    }, [events]);

    // Filtered events
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // Search query filter
            const query = searchQuery.trim().toLowerCase();
            const matchesQuery = !query || 
                event.name.toLowerCase().includes(query) ||
                (event.festivalName && event.festivalName.toLowerCase().includes(query)) ||
                (event.venue && event.venue.toLowerCase().includes(query)) ||
                (event.rules && event.rules.toLowerCase().includes(query)) ||
                (event.description && event.description.toLowerCase().includes(query));

            // Festival filter
            const matchesFestival = selectedFestivalFilter === 'all' || 
                (event.festivalName || 'General') === selectedFestivalFilter;

            // Rules / Registration status filter
            let matchesRulesFilter = true;
            if (selectedRulesFilter === 'with-rules') {
                const parsed = parseEventRules(event.rules);
                matchesRulesFilter = parsed.totalCount > 0;
            } else if (selectedRulesFilter === 'open-registration') {
                matchesRulesFilter = !isEventRegistrationClosed(event.registrationDeadline, event.eventDate);
            }

            return matchesQuery && matchesFestival && matchesRulesFilter;
        });
    }, [events, searchQuery, selectedFestivalFilter, selectedRulesFilter]);

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const toggleRuleExpansion = (eventId: number) => {
        setExpandedRules(prev => ({
            ...prev,
            [eventId]: !prev[eventId]
        }));
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Top Navigation / Breadcrumb Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                    <Link
                        to="/donor-portal"
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
                        title="Back to Donor Portal"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-700" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Donor Portal
                            </span>
                            <span className="text-slate-400 text-xs">/</span>
                            <span className="text-xs font-semibold text-slate-600">Event Rules</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2.5">
                            <BookOpen className="w-7 h-7 text-amber-600" />
                            Events &amp; Rules
                        </h1>
                    </div>
                </div>

                {/* <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={fetchEvents}
                        disabled={isLoading}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <Link
                        to="/donor-portal/register-events"
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                        <Layers className="w-4 h-4" />
                        Register for Events
                    </Link>
                </div> */}
            </div>

            {/* Subtitle / Intro Banner */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50/40 p-4 sm:p-5 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                            Festival Participation Guidelines &amp; Competition Rules
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                            Review detailed rules, performance criteria, team size requirements, and deadlines for all scheduled events before registering.
                        </p>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-200">
                    <span>Total Events: {events.length}</span>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by event name, rules, festival, or venue..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Filters Dropdown */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Festival Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-500 font-medium">Festival:</span>
                        <select
                            value={selectedFestivalFilter}
                            onChange={(e) => setSelectedFestivalFilter(e.target.value)}
                            className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                        >
                            <option value="all">All Festivals</option>
                            {festivalOptions.map(fName => (
                                <option key={fName} value={fName}>{fName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Rules Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                        <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-500 font-medium">Filter:</span>
                        <select
                            value={selectedRulesFilter}
                            onChange={(e) => setSelectedRulesFilter(e.target.value as any)}
                            className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                        >
                            <option value="all">All Events ({events.length})</option>
                            <option value="with-rules">With Custom Rules</option>
                            <option value="open-registration">Open Registrations</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto mb-3"></div>
                    <p className="text-slate-600 font-semibold text-sm">Loading event rules &amp; guidelines...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                    <h3 className="font-bold text-red-900 text-base">Error Loading Events</h3>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 text-base">No Events Match Your Filters</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Try clearing search terms or selecting &quot;All Festivals&quot; to see available events and rules.
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setSelectedFestivalFilter('all');
                            setSelectedRulesFilter('all');
                        }}
                        className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                        Reset All Filters
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Header bar of the table */}
                    <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                Scheduled Events ({filteredEvents.length})
                            </h3>
                            <span className="text-xs text-slate-500">
                                Tabular View
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            Click &quot;View Full Details&quot; on any event for coordinator contacts and sharing options.
                        </span>
                    </div>

                    {/* Tabular Events Presentation */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 border-collapse">
                            <thead>
                                <tr className="bg-slate-100/80 text-slate-700 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-[28%] min-w-[220px]">
                                        Event Name
                                    </th>
                                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-[22%] min-w-[190px]">
                                        Event Date
                                    </th>
                                    <th scope="col" className="py-3.5 px-4 sm:px-6 w-[50%] min-w-[320px]">
                                        Event Rules
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {filteredEvents.map((event, idx) => {
                                    const parsedRules = parseEventRules(event.rules);
                                    const hasCustomRules = parsedRules.totalCount > 0;
                                    const isClosed = isEventRegistrationClosed(event.registrationDeadline, event.eventDate);
                                    const isExpanded = !!expandedRules[event.id];

                                    return (
                                        <tr 
                                            key={event.id || idx}
                                            className="hover:bg-amber-50/20 transition-colors align-top"
                                        >
                                            {/* Column 1: Event Name */}
                                            <td className="py-4 px-4 sm:px-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <div>
                                                            <h4 className="font-extrabold text-slate-950 text-base leading-snug">
                                                                {event.name}
                                                            </h4>
                                                            {event.festivalName && (
                                                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px] rounded-md">
                                                                    {event.festivalName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Description if available */}
                                                    {event.description && (
                                                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                                                            {event.description}
                                                        </p>
                                                    )}

                                                    {/* Badges / Metadata */}
                                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                                        {event.isGroupEvent ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold rounded">
                                                                <Users className="w-3 h-3 text-indigo-600" />
                                                                Group ({event.minGroupSize || 1} - {event.maxGroupSize || 20} members)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded">
                                                                Solo / Individual
                                                            </span>
                                                        )}

                                                        {event.venue && (
                                                            <span className="inline-flex items-center gap-1 text-slate-600">
                                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                                {event.venue}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="pt-2 flex flex-wrap items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedEventForModal(event)}
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                                                            View Details &amp; Contacts
                                                        </button>

                                                        <Link
                                                            to={`/events/${event.id}`}
                                                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                                                        >
                                                            Public Link
                                                            <ChevronRight className="w-3 h-3 text-slate-500" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Event Date */}
                                            <td className="py-4 px-4 sm:px-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <div className="p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/80 shrink-0 mt-0.5">
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-sm">
                                                                {event.eventDate ? formatUTCDate(event.eventDate, {
                                                                    weekday: 'short',
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                }) : 'Date TBA'}
                                                            </div>
                                                            {(event.startTime || event.endTime) && (
                                                                <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5 font-medium">
                                                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                                    <span>
                                                                        {event.startTime ? formatTime(event.startTime) : ''}
                                                                        {event.startTime && event.endTime ? ' - ' : ''}
                                                                        {event.endTime ? formatTime(event.endTime) : ''}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Registration Deadline & Status */}
                                                    <div className="pt-1.5 border-t border-slate-100 space-y-1">
                                                        {isClosed ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                                <AlertCircle className="w-3 h-3 text-red-500" />
                                                                Registration Closed
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                Registration Open
                                                            </span>
                                                        )}

                                                        {event.registrationDeadline && (
                                                            <div className="text-[11px] text-slate-500">
                                                                <span className="font-medium">Deadline: </span>
                                                                <span className="font-semibold text-slate-700">
                                                                    {formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 3: Event Rules */}
                                            <td className="py-4 px-4 sm:px-6">
                                                {hasCustomRules ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/70 px-2.5 py-0.5 rounded-md border border-amber-200">
                                                                <BookOpen className="w-3 h-3 text-amber-700" />
                                                                {parsedRules.totalCount} {parsedRules.totalCount === 1 ? 'Rule' : 'Rules'}
                                                                {parsedRules.hasSections && ` (${parsedRules.sections.length} Categories)`}
                                                            </span>

                                                            {parsedRules.totalCount > 3 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleRuleExpansion(event.id)}
                                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                                                >
                                                                    {isExpanded ? 'Show Less' : `Show All (${parsedRules.totalCount})`}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Rendered Rules */}
                                                        {parsedRules.hasSections ? (
                                                            <div className="space-y-2.5">
                                                                {(isExpanded ? parsedRules.sections : parsedRules.sections.slice(0, 2)).map((sec, sIdx) => (
                                                                    <div 
                                                                        key={sIdx}
                                                                        className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3 space-y-1.5"
                                                                    >
                                                                        {sec.title && (
                                                                            <h5 className="font-bold text-amber-950 text-xs uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-amber-200/50">
                                                                                <Tag className="w-3 h-3 text-amber-700" />
                                                                                {sec.title}
                                                                            </h5>
                                                                        )}
                                                                        <ul className="space-y-1 text-xs text-slate-800">
                                                                            {(isExpanded ? sec.items : sec.items.slice(0, 3)).map((item, iIdx) => (
                                                                                <li key={iIdx} className="flex items-start gap-2 leading-relaxed">
                                                                                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                                                        {iIdx + 1}
                                                                                    </span>
                                                                                    <span>{item}</span>
                                                                                </li>
                                                                            ))}
                                                                            {!isExpanded && sec.items.length > 3 && (
                                                                                <li className="text-[11px] text-amber-800 font-semibold italic pl-6">
                                                                                    + {sec.items.length - 3} more in this section
                                                                                </li>
                                                                            )}
                                                                        </ul>
                                                                    </div>
                                                                ))}
                                                                {!isExpanded && parsedRules.sections.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleRuleExpansion(event.id)}
                                                                        className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 w-full text-center transition-colors cursor-pointer"
                                                                    >
                                                                        View {parsedRules.sections.length - 2} more rule categories &rarr;
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {(isExpanded ? parsedRules.sections[0]?.items : parsedRules.sections[0]?.items.slice(0, 4))?.map((item, iIdx) => (
                                                                    <div key={iIdx} className="flex items-start gap-2 p-2 bg-amber-50/40 rounded-lg border border-amber-100 text-xs text-slate-800 leading-relaxed">
                                                                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                                            {iIdx + 1}
                                                                        </span>
                                                                        <span>{item}</span>
                                                                    </div>
                                                                ))}
                                                                {!isExpanded && (parsedRules.sections[0]?.items?.length || 0) > 4 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleRuleExpansion(event.id)}
                                                                        className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 w-full text-center transition-colors cursor-pointer"
                                                                    >
                                                                        View all {parsedRules.sections[0]?.items?.length} rules &rarr;
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs italic flex items-start gap-2">
                                                        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                        <span>
                                                            Standard community celebration guidelines apply. Please follow coordinator instructions on the event day.
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Rules Details Popup Modal */}
            <EventRulesDetailsModal
                event={selectedEventForModal}
                isOpen={Boolean(selectedEventForModal)}
                onClose={() => setSelectedEventForModal(null)}
                onRegisterClick={(evt) => {
                    setSelectedEventForModal(null);
                    navigate(`/donor-portal/register-events`);
                }}
            />
        </div>
    );
};

export default DonorEventRulesPage;
