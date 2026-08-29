import React, { useState, useEffect, useCallback } from 'react';
// FIX: Split imports between react-router and react-router-dom to fix export resolution issues.
import { useParams, useOutletContext } from 'react-router';
import { Link } from 'react-router-dom';
import type { Event, Festival } from '../types/index';
import { isEventRegistrationClosed } from '../types/events';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import FestivalNavigation from '../components/FestivalNavigation';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { formatUTCDate } from '../utils/formatting';
import { useModal } from '../contexts/ModalContext';
import { BookOpen, ExternalLink, LayoutGrid, Table } from 'lucide-react';
import { EventRulesDetailsModal } from '../components/EventRulesDetailsModal';

type ViewFormat = 'tiled' | 'tabular';

const Events: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token, logout } = useAuth();
    const { openEventModal, openConfirmationModal, openHistoryModal } = useModal();
    const outletContext = useOutletContext<{ eventDataVersion: number }>();
    const eventDataVersion = outletContext?.eventDataVersion ?? 0;

    const [events, setEvents] = useState<Event[]>([]);
    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEventForRules, setSelectedEventForRules] = useState<any | null>(null);
    const [viewFormat, setViewFormat] = useState<ViewFormat>(() => {
        const saved = localStorage.getItem('festival_events_view_format');
        return saved === 'tabular' || saved === 'tiled' ? saved : 'tabular';
    });

    const handleViewFormatChange = (format: ViewFormat) => {
        setViewFormat(format);
        localStorage.setItem('festival_events_view_format', format);
    };

    const fetchEvents = useCallback(async () => {
        if (!id || !token) return;
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [eventsRes, festivalRes] = await Promise.all([
                fetch(`${API_URL}/festivals/${id}/events`, { headers }),
                fetch(`${API_URL}/festivals/${id}`, { headers })
            ]);

            if (eventsRes.status === 401 || festivalRes.status === 401) { logout(); return; }
            if (!eventsRes.ok || !festivalRes.ok) throw new Error('Failed to fetch event data');

            setEvents(await eventsRes.json());
            setFestival(await festivalRes.json());

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [id, token, logout]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents, eventDataVersion]);
    
    const formatTime = (timeStr: string | null) => {
      if (!timeStr) return '';
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(Number(hours), Number(minutes));
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    if (isLoading) return <div className="text-center p-8">Loading events...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <FestivalNavigation festivalId={id!} festivalName={festival?.name} />
            
            {/* View Selector & Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-slate-800">
                        Festival Events {events.length > 0 && <span className="text-slate-500 font-normal">({events.length})</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage all events, rules, deadlines, and participant registrations for this festival.
                    </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => handleViewFormatChange('tiled')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            viewFormat === 'tiled'
                                ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                        title="Tiled Card View"
                        aria-pressed={viewFormat === 'tiled'}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Tiled</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleViewFormatChange('tabular')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            viewFormat === 'tabular'
                                ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                        title="Tabular View"
                        aria-pressed={viewFormat === 'tabular'}
                    >
                        <Table className="w-3.5 h-3.5" />
                        <span>Tabular</span>
                    </button>
                </div>
            </div>

            {/* TILED FORMAT */}
            {viewFormat === 'tiled' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => {
                        const eventDate = event.eventDate || (event as any).event_date;
                        const startTime = event.startTime || (event as any).start_time;
                        const endTime = event.endTime || (event as any).end_time;
                        const image = event.image || (event as any).image_data;
                        const deadline = event.registrationDeadline || (event as any).registration_deadline;
                        const isClosed = isEventRegistrationClosed(deadline, eventDate);

                        return (
                            <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                                <div className="relative">
                                    <img src={image || `https://via.placeholder.com/400x200.png/E2E8F0/475569?text=${encodeURIComponent(event.name)}`} alt={event.name} className="w-full h-48 object-cover"/>
                                    <div className="absolute top-2 right-2">
                                        {isClosed ? (
                                            <span className="px-2.5 py-1 text-xs font-bold rounded-full shadow bg-red-600 text-white">
                                                Registration Closed
                                            </span>
                                        ) : deadline ? (
                                            <span className="px-2.5 py-1 text-xs font-bold rounded-full shadow bg-amber-500 text-white">
                                                Closes: {formatUTCDate(deadline, { day: 'numeric', month: 'short' })}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-xs font-bold rounded-full shadow bg-emerald-600 text-white">
                                                Registration Open
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-lg font-bold text-slate-800">{event.name}</h3>
                                        {event.isGroupEvent && (
                                            <span className="shrink-0 text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                                                👥 Group ({event.minGroupSize || 1}-{event.maxGroupSize || 20})
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 flex items-center space-x-4">
                                        {eventDate && <span>🗓️ {formatUTCDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric'})}</span>}
                                        {startTime && <span>⏰ {formatTime(startTime)}{endTime ? ` - ${formatTime(endTime)}` : ''}</span>}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">📍 {event.venue}</p>
                                    {deadline && (
                                        <p className={`mt-2 text-xs font-medium ${isClosed ? 'text-red-600' : 'text-amber-700'}`}>
                                            ⏳ Last date to register: {formatUTCDate(deadline, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                    <p className="mt-3 text-sm text-slate-500 line-clamp-2">{event.description}</p>
                                    
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEventForRules(event)}
                                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" /> View Rules & Details
                                        </button>
                                        <Link
                                            to={`/events/${event.id}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"
                                            title="Preview public page"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <Link
                                            to={`/events/${event.id}/registrations`}
                                            className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full hover:bg-blue-200 transition-colors"
                                        >
                                            <UsersIcon className="w-4 h-4 mr-1.5" />
                                            {event.registrationCount ?? 0} Registrations
                                        </Link>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => openHistoryModal('events', event.id, `History for ${event.name}`)} className="text-slate-400 hover:text-blue-600" title="View History"><HistoryIcon className="w-4 h-4" /></button>
                                        <button onClick={() => openEventModal(event)} className="text-slate-400 hover:text-slate-800" title="Edit Event"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => openConfirmationModal(event.id, 'events')} className="text-red-400 hover:text-red-600" title="Archive Event"><DeleteIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-200">
                            <p className="text-lg">No events have been added for this festival yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Click "Add Event" in the header to create your first event.</p>
                        </div>
                    )}
                </div>
            )}

            {/* TABULAR FORMAT */}
            {viewFormat === 'tabular' && (
                <div className="bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Event
                                    </th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Venue
                                    </th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Registration Status
                                    </th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Rules & Public Page
                                    </th>
                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Registrations
                                    </th>
                                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {events.map(event => {
                                    const eventDate = event.eventDate || (event as any).event_date;
                                    const startTime = event.startTime || (event as any).start_time;
                                    const endTime = event.endTime || (event as any).end_time;
                                    const image = event.image || (event as any).image_data;
                                    const deadline = event.registrationDeadline || (event as any).registration_deadline;
                                    const isClosed = isEventRegistrationClosed(deadline, eventDate);

                                    return (
                                        <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Event Info */}
                                            <td className="px-5 py-4 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={image || `https://via.placeholder.com/80x80.png/E2E8F0/475569?text=${encodeURIComponent(event.name.substring(0, 2))}`}
                                                        alt={event.name}
                                                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                                                    />
                                                    <div className="min-w-0 max-w-xs">
                                                        <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                                                            <span>{event.name}</span>
                                                        </div>
                                                        {event.isGroupEvent && (
                                                            <div className="mt-1">
                                                                <span className="inline-block text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                                                                    👥 Group ({event.minGroupSize || 1}-{event.maxGroupSize || 20})
                                                                </span>
                                                            </div>
                                                        )}
                                                        {event.description && (
                                                            <p className="text-xs text-slate-500 truncate mt-0.5" title={event.description}>
                                                                {event.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date & Time */}
                                            <td className="px-5 py-4 whitespace-nowrap align-middle">
                                                <div className="text-xs font-semibold text-slate-800">
                                                    {eventDate ? formatUTCDate(eventDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </div>
                                                {(startTime || endTime) && (
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {formatTime(startTime)}{endTime ? ` - ${formatTime(endTime)}` : ''}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Venue */}
                                            <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700 align-middle">
                                                <span>📍 {event.venue || '—'}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4 whitespace-nowrap align-middle">
                                                {isClosed ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                        Registration Closed
                                                    </span>
                                                ) : deadline ? (
                                                    <div>
                                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                                            Closes: {formatUTCDate(deadline, { day: 'numeric', month: 'short' })}
                                                        </span>
                                                        <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                                                            Last date: {formatUTCDate(deadline, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                        Registration Open
                                                    </span>
                                                )}
                                            </td>

                                            {/* Rules & Public preview */}
                                            <td className="px-5 py-4 whitespace-nowrap text-xs align-middle">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedEventForRules(event)}
                                                        className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                                                    >
                                                        <BookOpen className="w-3.5 h-3.5" /> View Rules
                                                    </button>
                                                    <Link
                                                        to={`/events/${event.id}`}
                                                        target="_blank"
                                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                        title="Open public page in new tab"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </td>

                                            {/* Registrations */}
                                            <td className="px-5 py-4 whitespace-nowrap align-middle">
                                                <Link
                                                    to={`/events/${event.id}/registrations`}
                                                    className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-full transition-colors"
                                                >
                                                    <UsersIcon className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                                    {event.registrationCount ?? 0} Registrations
                                                </Link>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium align-middle">
                                                <div className="flex items-center justify-end space-x-3">
                                                    <button
                                                        onClick={() => openHistoryModal('events', event.id, `History for ${event.name}`)}
                                                        className="text-slate-400 hover:text-blue-600 p-1 hover:bg-slate-100 rounded transition-colors"
                                                        title="View History"
                                                    >
                                                        <HistoryIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEventModal(event)}
                                                        className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded transition-colors"
                                                        title="Edit Event"
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openConfirmationModal(event.id, 'events')}
                                                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                        title="Archive Event"
                                                    >
                                                        <DeleteIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {events.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <p className="text-lg">No events have been added for this festival yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Click "Add Event" in the header to create your first event.</p>
                        </div>
                    )}
                </div>
            )}

            <EventRulesDetailsModal
                event={selectedEventForRules}
                isOpen={!!selectedEventForRules}
                onClose={() => setSelectedEventForRules(null)}
            />
        </div>
    );
};

export default Events;
