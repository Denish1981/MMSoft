import React, { useState } from 'react';
import { formatUTCDate } from '../utils/formatting';
import type { PublicEvent } from './RegistrationModal';
import { isEventRegistrationClosed } from '../types/events';
import { BookOpen, ExternalLink } from 'lucide-react';
import { EventRulesDetailsModal } from './EventRulesDetailsModal';
import { Link } from 'react-router-dom';

interface EventCardProps {
    event: PublicEvent;
    onRegisterClick: (event: PublicEvent) => void;
    hasApprovedContribution?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onRegisterClick, hasApprovedContribution = false }) => {
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const isClosed = isEventRegistrationClosed(event.registrationDeadline, event.eventDate);

    return (
        <>
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
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
                    <p className="mt-3 text-sm text-slate-500 line-clamp-3 flex-grow">{event.description}</p>
                    
                    {/* View Rules & Details trigger */}
                    <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                        <button
                            type="button"
                            onClick={() => setIsRulesModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                        >
                            <BookOpen className="w-3.5 h-3.5" /> View Rules & Details
                        </button>
                        <Link
                            to={`/events/${event.id}`}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"
                            title="Open standalone page"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* Register Now CTA: visible only if the user is registered (authenticated) and has an approved contribution */}
                    {hasApprovedContribution && (
                        <div className="mt-3">
                            <button 
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isClosed) onRegisterClick(event); 
                                }}
                                disabled={isClosed}
                                className={`inline-block w-full text-center px-4 py-2.5 font-semibold rounded-xl shadow-xs transition-colors ${
                                    isClosed
                                        ? "bg-slate-200 text-slate-500 cursor-not-allowed select-none"
                                        : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                                }`}
                            >
                                {isClosed ? "Registration Closed" : "Register Now"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <EventRulesDetailsModal
                event={event}
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
                onRegisterClick={onRegisterClick}
                hasApprovedContribution={hasApprovedContribution}
            />
        </>
    );
};
