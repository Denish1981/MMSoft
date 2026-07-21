import React from 'react';
import { formatUTCDate } from '../utils/formatting';
import type { PublicEvent } from './RegistrationModal';

interface EventCardProps {
    event: PublicEvent;
    onRegisterClick: (event: PublicEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onRegisterClick }) => {
    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-800">{event.name}</h3>
                <div className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>🗓️ {formatUTCDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {event.startTime && <span>⏰ {formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">📍 {event.venue}</p>
                <p className="mt-4 text-sm text-slate-500 flex-grow">{event.description}</p>
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => onRegisterClick(event)}
                        className="inline-block w-full text-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                    >
                        Register Now
                    </button>
                </div>
            </div>
        </div>
    );
};
