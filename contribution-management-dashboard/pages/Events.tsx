

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import type { Event, Festival } from '../types';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import FestivalNavigation from '../components/FestivalNavigation';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';

interface EventsPageProps {
    onEdit: (event: Event) => void;
    onDelete: (id: number) => void;
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

const Events: React.FC<EventsPageProps> = ({ onEdit, onDelete, onViewHistory }) => {
    const { id } = useParams<{ id: string }>();
    const { token, logout } = useAuth();
    const outletContext = useOutletContext<{ eventDataVersion: number }>();
    const eventDataVersion = outletContext?.eventDataVersion ?? 0;

    const [events, setEvents] = useState<Event[]>([]);
    const [festival, setFestival] = useState<Festival | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                        <img src={event.image || `https://via.placeholder.com/400x200.png/E2E8F0/475569?text=${encodeURIComponent(event.name)}`} alt={event.name} className="w-full h-48 object-cover"/>
                        <div className="p-4 flex flex-col flex-grow">
                            <h3 className="text-lg font-bold text-slate-800">{event.name}</h3>
                            <div className="mt-2 text-sm text-slate-600 flex items-center space-x-4">
                                <span>🗓️ {new Date(event.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                {event.startTime && <span>⏰ {formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}</span>}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">📍 {event.venue}</p>
                            <p className="mt-3 text-sm text-slate-500 flex-grow">{event.description}</p>
                        </div>
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                                {event.contactPersons.length > 0 && (
                                    <span>Contact: {event.contactPersons[0].name}</span>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => onViewHistory('events', event.id, `History for ${event.name}`)} className="text-slate-400 hover:text-blue-600" title="View History"><HistoryIcon className="w-4 h-4" /></button>
                                <button onClick={() => onEdit(event)} className="text-slate-400 hover:text-slate-800" title="Edit Event"><EditIcon className="w-4 h-4" /></button>
                                <button onClick={() => onDelete(event.id)} className="text-red-400 hover:text-red-600" title="Archive Event"><DeleteIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                ))}
                 {events.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 text-slate-500">
                        <p className="text-lg">No events have been added for this festival yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events;