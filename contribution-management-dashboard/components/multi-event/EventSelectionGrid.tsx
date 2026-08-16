import React, { useState } from 'react';
import { Calendar, CheckSquare, Square, Clock, Building2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import type { PublicEvent } from '../RegistrationModal';
import { isEventRegistrationClosed } from '../../types/events';
import { EventRulesDetailsModal } from '../EventRulesDetailsModal';

interface EventSelectionGridProps {
    events: PublicEvent[];
    selectedEventIds: number[];
    onToggleEvent: (eventId: number) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    eventParticipantsMap: Record<number, any[]>;
}

export const EventSelectionGrid: React.FC<EventSelectionGridProps> = ({
    events,
    selectedEventIds,
    onToggleEvent,
    onSelectAll,
    onDeselectAll,
    eventParticipantsMap
}) => {
    const [selectedEventForRules, setSelectedEventForRules] = useState<PublicEvent | null>(null);
    const openEvents = events.filter(e => !isEventRegistrationClosed(e.registrationDeadline, e.eventDate));
    const isAllSelected = openEvents.length > 0 && selectedEventIds.length === openEvents.length;

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" /> Choose Events to Register ({selectedEventIds.length}/{openEvents.length} open)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Select one or more open events from the list below to register multiple family members at once.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={isAllSelected ? onDeselectAll : onSelectAll}
                            disabled={openEvents.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAllSelected ? (
                                <>
                                    <Square className="w-4 h-4 text-slate-500" /> Deselect All
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="w-4 h-4 text-blue-600" /> Select All Open ({openEvents.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((evt) => {
                        const isClosed = isEventRegistrationClosed(evt.registrationDeadline, evt.eventDate);
                        const isSelected = selectedEventIds.includes(evt.id);
                        const participantCount = eventParticipantsMap[evt.id]?.length || 0;

                        return (
                            <div
                                key={evt.id}
                                onClick={() => {
                                    if (!isClosed) {
                                        onToggleEvent(evt.id);
                                    }
                                }}
                                className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                                    isClosed
                                        ? 'bg-slate-100/70 border-slate-200 opacity-70 cursor-not-allowed select-none'
                                        : isSelected
                                            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md cursor-pointer'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                                            {evt.name}
                                        </h4>
                                        <div className="shrink-0">
                                            {isClosed ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                                    <AlertCircle className="w-3 h-3" /> Closed
                                                </span>
                                            ) : isSelected ? (
                                                <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                                            ) : (
                                                <Square className="w-5 h-5 text-slate-300" />
                                            )}
                                        </div>
                                    </div>

                                    {evt.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                                            {evt.description}
                                        </p>
                                    )}

                                    <div className="mb-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEventForRules(evt);
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                                        >
                                            <BookOpen className="w-3 h-3" /> View Rules & Details
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{evt.eventDate}</span>
                                        {evt.startTime && (
                                            <span className="text-slate-400 flex items-center gap-1 ml-1">
                                                <Clock className="w-3 h-3" /> {evt.startTime}
                                            </span>
                                        )}
                                    </div>

                                    {evt.registrationDeadline && (
                                        <div className={`text-[11px] font-medium ${isClosed ? 'text-red-600' : 'text-amber-700'}`}>
                                            ⏳ Last date to register: {evt.registrationDeadline}
                                        </div>
                                    )}

                                    {evt.venue && (
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">{evt.venue}</span>
                                        </div>
                                    )}

                                    {!isClosed && isSelected && (
                                        <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-between text-blue-700 font-semibold">
                                            <span>Participants added:</span>
                                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                                                {participantCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <EventRulesDetailsModal
                event={selectedEventForRules}
                isOpen={!!selectedEventForRules}
                onClose={() => setSelectedEventForRules(null)}
            />
        </>
    );
};
