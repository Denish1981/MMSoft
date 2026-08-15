import React from 'react';
import { formatUTCDate } from '../utils/formatting';
import type { PublicEvent } from './RegistrationModal';
import { isEventRegistrationClosed } from '../types/events';

interface EventCardProps {
    event: PublicEvent;
    onRegisterClick: (event: PublicEvent) => void;
    hasApprovedContribution?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onRegisterClick, hasApprovedContribution = false }) => {
    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const isClosed = isEventRegistrationClosed(event.registrationDeadline, event.eventDate);

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold text-slate-800">{event.name}</h3>
                    {isClosed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 whitespace-nowrap">
                            Registration Closed
                        </span>
                    ) : event.registrationDeadline ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 whitespace-nowrap">
                            Closes: {formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'short' })}
                        </span>
                    ) : null}
                </div>
                <div className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>🗓️ {formatUTCDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {event.startTime && <span>⏰ {formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">📍 {event.venue}</p>
                {event.registrationDeadline && (
                    <p className={`mt-2 text-xs font-medium ${isClosed ? 'text-red-600' : 'text-amber-700'}`}>
                        ⏳ Last date to register: {formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
                <p className="mt-3 text-sm text-slate-500 flex-grow">{event.description}</p>
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="relative group w-full" title={!hasApprovedContribution ? "You need to contribute to Register for Stall / Events" : undefined}>
                        <button 
                            type="button"
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isClosed && hasApprovedContribution) onRegisterClick(event); 
                            }}
                            disabled={isClosed || !hasApprovedContribution}
                            className={`inline-block w-full text-center px-4 py-2 font-semibold rounded-lg shadow-md transition-colors ${
                                isClosed
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed select-none"
                                    : hasApprovedContribution
                                        ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                        : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 select-none"
                            }`}
                        >
                            {isClosed ? "Registration Closed" : "Register Now"}
                        </button>
                        {!hasApprovedContribution && !isClosed && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-1.5 px-3 z-20 whitespace-nowrap shadow-lg text-center pointer-events-none">
                                You need to contribute to Register for Stall / Events
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
