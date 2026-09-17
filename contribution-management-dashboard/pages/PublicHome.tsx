import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
    Calendar, Clock, Sparkles, Sun, Moon, 
    ChevronLeft, ChevronRight, Copy, Check, ArrowRight, CheckCircle2,
    Ticket, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import type { ScheduleMaster, ScheduleEntry } from '../types';
import type { Event } from '../types/events';
import { isEventRegistrationClosed } from '../types/events';
import { 
    sortSchedules, 
    sortScheduleEntries, 
    getDailyRecurringEvents, 
    isDailyRecurringEvent 
} from '../utils/scheduleUtils';

// Helper to determine today's date in festival / local timezone (IST / local)
const getTodayDateStr = (): string => {
    // 1. Check Indian Standard Time (Asia/Kolkata) as Ganpati Utsav is based in India
    try {
        const istFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const istDate = istFormatter.format(new Date());
        if (istDate && /^\d{4}-\d{2}-\d{2}$/.test(istDate)) {
            return istDate;
        }
    } catch {
        // fallback
    }

    // 2. Client browser's local timezone
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Helper to render event timings cleanly across multiple lines (e.g., start time on top, end time below)
const renderTimingMultiline = (timings?: string) => {
    if (!timings) return <span className="text-slate-400">—</span>;

    // Handle explicit newlines
    if (timings.includes('\n')) {
        const lines = timings.split('\n').map(s => s.trim()).filter(Boolean);
        return (
            <div className="flex flex-col leading-tight gap-0.5">
                {lines.map((line, i) => (
                    <span key={i} className="font-bold text-orange-700 whitespace-nowrap text-xs">
                        {line}
                    </span>
                ))}
            </div>
        );
    }

    // Handle "X to Y" or "X - Y" or "X – Y"
    const toMatch = timings.match(/^(.+?)\s+(to|-|–)\s+(.+)$/i);
    if (toMatch) {
        const startTime = toMatch[1].trim();
        const endTime = toMatch[3].trim();
        return (
            <div className="flex flex-col leading-snug">
                <span className="font-bold text-orange-700 whitespace-nowrap text-xs">
                    {startTime}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                    to {endTime}
                </span>
            </div>
        );
    }

    // Handle comma or semicolon separated times
    if (timings.includes(',') || timings.includes(';')) {
        const parts = timings.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        return (
            <div className="flex flex-col leading-tight gap-0.5">
                {parts.map((p, i) => (
                    <span key={i} className="font-bold text-orange-700 whitespace-nowrap text-xs">
                        {p}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <span className="font-bold text-orange-700 whitespace-nowrap text-xs">
            {timings}
        </span>
    );
};

interface PublicTodayScheduleWidgetProps {
    schedules: ScheduleMaster[];
    onViewFullSchedule: () => void;
    formatDateStr: (dateStr: string) => string;
}

const PublicTodayScheduleWidget: React.FC<PublicTodayScheduleWidgetProps> = ({
    schedules,
    onViewFullSchedule,
    formatDateStr,
}) => {
    const activeSchedule = useMemo(() => {
        return schedules.find(s => s.isActive) || schedules[0] || null;
    }, [schedules]);

    const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);

    const currentSchedule = useMemo(() => {
        if (selectedScheduleId) {
            return schedules.find(s => s.id === selectedScheduleId) || activeSchedule;
        }
        return activeSchedule;
    }, [schedules, selectedScheduleId, activeSchedule]);

    const todayStr = useMemo(() => getTodayDateStr(), []);

    // Distinct dates in the current schedule sorted chronologically
    const scheduleDates = useMemo(() => {
        if (!currentSchedule || !currentSchedule.entries) return [];
        const set = new Set<string>();
        currentSchedule.entries.forEach(e => {
            const d = e.eventDate ? e.eventDate.split('T')[0] : '';
            if (d) set.add(d);
        });
        return Array.from(set).sort();
    }, [currentSchedule]);

    // Initialize selectedDate with today's date if present, or fallback to first schedule date
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        if (scheduleDates.length > 0) {
            if (scheduleDates.includes(todayStr)) {
                setSelectedDate(todayStr);
            } else {
                setSelectedDate(scheduleDates[0]);
            }
        } else if (currentSchedule?.startDate) {
            setSelectedDate(currentSchedule.startDate.split('T')[0]);
        }
    }, [currentSchedule, scheduleDates, todayStr]);

    // Extract the 2 everyday recurring events
    const dailyEvents = useMemo(() => {
        return getDailyRecurringEvents(currentSchedule?.entries || []);
    }, [currentSchedule]);

    // Events for the selected date
    const dayEvents = useMemo(() => {
        if (!currentSchedule || !currentSchedule.entries) return [];
        const entries = currentSchedule.entries.filter(e => {
            const d = e.eventDate ? e.eventDate.split('T')[0] : '';
            return d === selectedDate;
        });
        return sortScheduleEntries(entries);
    }, [currentSchedule, selectedDate]);

    // Day Name for selected date
    const selectedDayLabel = useMemo(() => {
        if (!selectedDate) return '';
        const entryWithDay = dayEvents.find(e => e.day && e.day.trim());
        if (entryWithDay && entryWithDay.day) return entryWithDay.day;

        try {
            const parts = selectedDate.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString('en-US', { weekday: 'long' });
                }
            }
        } catch {}
        return '';
    }, [selectedDate, dayEvents]);

    const isSelectedToday = selectedDate === todayStr;
    const currentDateIndex = scheduleDates.indexOf(selectedDate);

    const handlePrevDate = () => {
        if (currentDateIndex > 0) {
            setSelectedDate(scheduleDates[currentDateIndex - 1]);
        }
    };

    const handleNextDate = () => {
        if (currentDateIndex < scheduleDates.length - 1) {
            setSelectedDate(scheduleDates[currentDateIndex + 1]);
        }
    };

    // Copy Day's Schedule to Clipboard
    const [copied, setCopied] = useState(false);
    const handleCopyDaySchedule = async () => {
        if (!currentSchedule) return;
        const lines = [
            `📅 ${currentSchedule.festivalName || 'Festival'} - ${selectedDayLabel ? `${selectedDayLabel} (${formatDateStr(selectedDate)})` : formatDateStr(selectedDate)}`,
            currentSchedule.title ? `Title: ${currentSchedule.title}` : '',
            ''
        ];

        if (dailyEvents.length > 0) {
            lines.push('🌟 Daily Events (Everyday):');
            dailyEvents.forEach(de => {
                lines.push(`• ${de.timings} - ${de.event}`);
            });
            lines.push('');
        }

        lines.push(`📋 Schedule for ${isSelectedToday ? 'Today' : formatDateStr(selectedDate)}:`);
        if (dayEvents.length === 0) {
            lines.push('• Daily routine programs in session.');
        } else {
            dayEvents.forEach(e => {
                lines.push(`• ${e.timings} - ${e.event}`);
            });
        }

        try {
            await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    if (!currentSchedule) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
                <Calendar className="w-12 h-12 text-orange-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Active Festival Schedule</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There is no festival schedule created yet. Click below to view all schedules.
                </p>
                <button
                    onClick={onViewFullSchedule}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-colors"
                >
                    View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Unified Single Header Widget */}
            <div className="p-5 md:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border-b border-slate-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="space-y-2.5">
                        {/* Festival Badges & Dates */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-300 flex items-center gap-1.5 ml-1 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-slate-400">Festival Dates:</span> {formatDateStr(currentSchedule.startDate)} — {formatDateStr(currentSchedule.endDate)}
                            </span>
                        </div>

                        {/* Festival Title */}
                        {currentSchedule.title && (
                            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
                                {currentSchedule.title}
                            </h3>
                        )}

                        {/* Day Schedule Info & Date */}
                        <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1 bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-500/30">
                                <Clock className="w-3.5 h-3.5" /> 
                                {currentDateIndex >= 0 ? `Day ${currentDateIndex + 1} Schedule` : 'Day Schedule'}
                            </span>
                            {isSelectedToday && (
                                <span className="px-2.5 py-0.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
                                    Today&apos;s Celebration
                                </span>
                            )}
                            <span className="text-lg md:text-xl font-bold text-white">
                                {selectedDayLabel ? `${selectedDayLabel}, ` : ''}{formatDateStr(selectedDate)}
                            </span>
                            <span className="text-xs text-slate-300 font-medium">
                                • <strong className="text-white font-bold">{dayEvents.length}</strong> {dayEvents.length === 1 ? 'event' : 'events'} on this day
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {schedules.length > 1 && (
                            <select
                                value={currentSchedule.id}
                                onChange={(e) => setSelectedScheduleId(Number(e.target.value))}
                                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                {schedules.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.festivalName || s.title}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="button"
                            onClick={handleCopyDaySchedule}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors cursor-pointer"
                            title="Copy today's schedule to share"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Share Day'}
                        </button>

                        <button
                            type="button"
                            onClick={onViewFullSchedule}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-md transition-all cursor-pointer"
                        >
                            Full Schedule <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-5">
                {/* 1. 2 Everyday Events Displayed on Top of the Events Table */}
                {dailyEvents.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border border-amber-200/90 rounded-xl p-4 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-200/80 text-amber-900 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-amber-700" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                                        Everyday Programs (Daily Recurring)
                                    </h4>
                                    <p className="text-[11px] text-amber-800">
                                        These sacred rituals take place every day throughout the entire festival
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full uppercase tracking-wider shrink-0">
                                Daily Routine
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dailyEvents.map((de, idx) => (
                                <div 
                                    key={idx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-white/95 rounded-xl border border-amber-200/80 shadow-2xs hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                                            idx === 0 
                                                ? 'bg-amber-100 text-amber-700' 
                                                : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {idx === 0 ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                                                {de.event}
                                            </div>
                                            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                {idx === 0 ? 'Morning Program' : 'Evening Program'} • Repeats Daily
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-extrabold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 self-start sm:self-center shrink-0 sm:ml-3 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                        <span>{de.timings}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Events Table for the Selected Day */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                            Schedule of Events ({dayEvents.length})
                        </h4>
                        <button
                            type="button"
                            onClick={onViewFullSchedule}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            View Complete 10-Day Timetable <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    {dayEvents.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                            <p className="text-xs text-slate-500 font-medium">
                                No special events are specifically listed for this date.
                            </p>
                            {dailyEvents.length > 0 && (
                                <p className="text-xs text-amber-800 font-semibold">
                                    The 2 daily recurring events shown above will take place as normal.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                                        <th className="py-2.5 px-4 w-12 text-center text-slate-400">#</th>
                                        <th className="py-2.5 px-4 w-40">Timings</th>
                                        <th className="py-2.5 px-4">Program / Event</th>
                                        <th className="py-2.5 px-4 w-32 text-center">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {dayEvents.map((entry, idx) => {
                                        const isDaily = isDailyRecurringEvent(entry, dailyEvents);

                                        return (
                                            <tr 
                                                key={entry.id || idx} 
                                                className={`transition-colors ${
                                                    isDaily ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-orange-50/30'
                                                }`}
                                            >
                                                <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="inline-flex items-start gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                                                        {renderTimingMultiline(entry.timings)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        {entry.event}
                                                    </div>
                                                    {entry.day && (
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {entry.day}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                                    {isDaily ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold text-[10px] border border-amber-200">
                                                            <Sparkles className="w-3 h-3 text-amber-600" /> Daily Event
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium text-[10px] border border-slate-200">
                                                            Special Program
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Date Selector Carousel Widget (Placed below the schedule) */}
                {scheduleDates.length > 0 && (
                    <div className="pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 -mx-5 -mb-5 p-4 rounded-b-2xl">
                        <div className="flex items-center gap-2 max-w-full">
                            <button
                                type="button"
                                onClick={handlePrevDate}
                                disabled={currentDateIndex <= 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent shrink-0 cursor-pointer transition-colors"
                                title="Previous Day"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[calc(100vw-120px)] sm:max-w-2xl">
                                {scheduleDates.map((dateStr, idx) => {
                                    const isSelected = dateStr === selectedDate;
                                    const isToday = dateStr === todayStr;

                                    return (
                                        <button
                                            key={dateStr}
                                            type="button"
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-600/30'
                                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                                            }`}
                                        >
                                            <span>Day {idx + 1}</span>
                                            <span className={`text-[11px] font-medium ${isSelected ? 'text-orange-100' : 'text-slate-500'}`}>
                                                ({formatDateStr(dateStr)})
                                            </span>
                                            {isToday && (
                                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isSelected ? 'bg-white text-orange-700' : 'bg-orange-500 text-white'
                                                }`}>
                                                    Today
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={handleNextDate}
                                disabled={currentDateIndex >= scheduleDates.length - 1}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent shrink-0 cursor-pointer transition-colors"
                                title="Next Day"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Jump to Today Button */}
                        {scheduleDates.includes(todayStr) && selectedDate !== todayStr && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className="px-3 py-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors cursor-pointer"
                            >
                                Jump to Today
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface FloatingPublicEventPillProps {
    events: Event[];
    formatDateStr: (dateStr?: string) => string;
}

const FloatingPublicEventPill: React.FC<FloatingPublicEventPillProps> = ({ events, formatDateStr }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isDismissed, setIsDismissed] = useState<boolean>(() => {
        try {
            return sessionStorage.getItem('dismiss_public_event_pill') === 'true';
        } catch {
            return false;
        }
    });

    if (isDismissed || events.length === 0) {
        return null;
    }

    const currentEvent = events[activeIndex % events.length];
    if (!currentEvent) return null;

    const handleDismiss = () => {
        setIsDismissed(true);
        try {
            sessionStorage.setItem('dismiss_public_event_pill', 'true');
        } catch {
            // ignore
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(prev => (prev === 0 ? events.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(prev => (prev + 1) % events.length);
    };

    return (
        <aside 
            id="floating-public-event-pill" 
            aria-label="Public Event Registration"
            className="fixed bottom-3 sm:bottom-6 inset-x-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none"
        >
            <div className="pointer-events-auto max-w-xl w-full bg-slate-900/95 backdrop-blur-md text-white rounded-2xl sm:rounded-full p-2 sm:p-2 pl-3 sm:pl-4 shadow-2xl border border-slate-700/70 flex items-center justify-between gap-2.5 sm:gap-3.5 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Event Info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Ticket className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400">
                                Open to All
                            </span>
                            {currentEvent.eventDate && (
                                <span className="text-[10px] text-slate-400 hidden xs:inline-block">
                                    • {formatDateStr(currentEvent.eventDate)}
                                </span>
                            )}
                            {events.length > 1 && (
                                <div className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1">
                                    <span>{activeIndex + 1}/{events.length}</span>
                                    <button 
                                        id="public-event-prev-btn"
                                        type="button" 
                                        onClick={handlePrev} 
                                        className="hover:text-white cursor-pointer p-0.5"
                                        title="Previous event"
                                        aria-label="Previous open event"
                                    >
                                        <ChevronLeft className="w-2.5 h-2.5" />
                                    </button>
                                    <button 
                                        id="public-event-next-btn"
                                        type="button" 
                                        onClick={handleNext} 
                                        className="hover:text-white cursor-pointer p-0.5"
                                        title="Next event"
                                        aria-label="Next open event"
                                    >
                                        <ChevronRight className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[135px] sm:max-w-xs leading-tight mt-0.5">
                            {currentEvent.name}
                        </div>
                    </div>
                </div>

                {/* Action CTA and Close Button */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Link
                        id="public-event-register-btn"
                        to={`/events/${currentEvent.id}`}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-1 sm:gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                        <span>Register Now</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Link>

                    <button
                        id="public-event-dismiss-btn"
                        type="button"
                        onClick={handleDismiss}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/80 transition-colors cursor-pointer"
                        title="Dismiss"
                        aria-label="Dismiss notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default function PublicHomePage() {
    const { isAuthenticated, hasPermission } = useAuth();
    const [activeSchedules, setActiveSchedules] = useState<ScheduleMaster[]>([]);
    const [publicEvents, setPublicEvents] = useState<Event[]>([]);
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
    const [viewMode, setViewMode] = useState<'today' | 'full'>('today');

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    useEffect(() => {
        let isMounted = true;
        const fetchActiveSchedules = async () => {
            try {
                const response = await fetch(`${API_URL}/public/schedules/active`);
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setActiveSchedules(sortSchedules(data || []));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch public active schedules:', err);
            } finally {
                if (isMounted) setIsLoadingSchedules(false);
            }
        };

        const fetchPublicEvents = async () => {
            try {
                const response = await fetch(`${API_URL}/public/events`);
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted && Array.isArray(data)) {
                        const openEvents = data.filter((e: Event) => {
                            const isOpen = e.requireContribution === false || e.requiresApprovedContribution === false;
                            const isClosed = isEventRegistrationClosed(e.registrationDeadline, e.eventDate);
                            return isOpen && !isClosed;
                        });
                        setPublicEvents(openEvents);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch public events:', err);
            }
        };

        fetchActiveSchedules();
        fetchPublicEvents();
        return () => {
            isMounted = false;
        };
    }, []);

    const formatDateStr = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr || '';
        }
    };

    const formatDateStrWithYear = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr || '';
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            <header className="bg-white shadow-sm border-b border-slate-100">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <Link to="/trust-details" className="text-2xl font-bold text-slate-800 tracking-wider">
                            Gold Towers Mitra Mandal Trust
                        </Link>
                        <div className="hidden md:flex items-center space-x-4">
                            <Link to="/photos" className="text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors">
                                Photo Albums
                            </Link>
                        </div>
                    </div>
                    <Link
                        to={dashboardTarget}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-amber-700 transition-all font-medium"
                    >
                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>

            <main className="container mx-auto px-6 py-12 pb-20 sm:pb-24 flex-grow space-y-12">
                {/* Active Festival Schedule Section */}
                {!isLoadingSchedules && activeSchedules.length > 0 && (
                    <div className="max-w-5xl mx-auto space-y-6 pt-6">

                        {/* Tab Content */}
                        {viewMode === 'today' ? (
                            <PublicTodayScheduleWidget
                                schedules={activeSchedules}
                                onViewFullSchedule={() => setViewMode('full')}
                                formatDateStr={formatDateStr}
                            />
                        ) : (
                            <div className="space-y-8">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('today')}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <Clock className="w-3.5 h-3.5" /> Back to Today&apos;s Schedule
                                    </button>
                                </div>
                                {activeSchedules.map((schedule) => (
                                    <div 
                                        key={schedule.id}
                                        className="bg-white rounded-3xl border border-orange-200 shadow-xl overflow-hidden"
                                    >
                                        {/* Schedule Card Banner */}
                                        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg uppercase tracking-wider mb-2">
                                                    {schedule.festivalName || 'Festival Celebration'}
                                                </span>
                                                <h3 className="text-2xl md:text-3xl font-extrabold">
                                                    {schedule.title || `${schedule.festivalName} Schedule`}
                                                </h3>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 text-center shrink-0">
                                                <div className="text-xs text-orange-100 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                                    <Calendar className="w-4 h-4" /> Schedule Dates
                                                </div>
                                                <div className="text-sm font-bold text-white mt-0.5">
                                                    {formatDateStrWithYear(schedule.startDate)} — {formatDateStrWithYear(schedule.endDate)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Entries Table */}
                                        <div className="p-6 md:p-8 space-y-6">
                                            {(() => {
                                                const dailyEvents = getDailyRecurringEvents(schedule.entries || []);
                                                return (
                                                    <>
                                                        {/* Daily Recurring Events Displayed on Top of the Events Table */}
                                                        {dailyEvents.length > 0 && (
                                                            <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 shadow-sm">
                                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1.5 bg-amber-200 rounded-lg text-amber-900">
                                                                            <Sparkles className="w-4 h-4 text-amber-700" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                                                                                Daily Recurring Events (Everyday of Festival)
                                                                            </h4>
                                                                            <p className="text-xs text-amber-800">
                                                                                These programs take place daily throughout the festival celebration
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-200 text-amber-950 rounded-full uppercase tracking-wider shrink-0">
                                                                        Everyday
                                                                    </span>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {dailyEvents.map((de, idx) => (
                                                                        <div 
                                                                            key={idx}
                                                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-white/95 rounded-xl border border-amber-200/80 shadow-2xs hover:shadow-sm transition-shadow"
                                                                        >
                                                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                                                                                    idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
                                                                                }`}>
                                                                                    {idx === 0 ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                                                                                        {de.event}
                                                                                    </div>
                                                                                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                                                        {idx === 0 ? 'Morning Program' : 'Evening Program'} • Repeats Daily
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-xs font-extrabold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 self-start sm:self-center shrink-0 sm:ml-3 flex items-center gap-1.5">
                                                                                <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                                                <span>{de.timings}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!schedule.entries || schedule.entries.length === 0 ? (
                                                            <p className="text-center text-slate-500 text-sm py-4 italic">
                                                                Schedule details are being prepared. Please check back soon!
                                                            </p>
                                                        ) : (
                                                            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                                                                <table className="w-full text-left text-sm border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                                                            <th className="py-3.5 px-5 w-40">Date</th>
                                                                            <th className="py-3.5 px-5">Event / Activity</th>
                                                                            <th className="py-3.5 px-5 w-44">Timings</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                                        {sortScheduleEntries(schedule.entries).map((entry, idx) => {
                                                                            const isDaily = isDailyRecurringEvent(entry, dailyEvents);

                                                                            return (
                                                                                <tr key={entry.id || idx} className={`transition-colors ${isDaily ? 'bg-amber-50/20 hover:bg-amber-50/50' : 'hover:bg-orange-50/40'}`}>
                                                                                    <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                                                                                        {formatDateStr(entry.eventDate)}, {entry.day || '—'}
                                                                                    </td>
                                                                                    <td className="py-4 px-5 font-medium text-slate-800">
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <span>{entry.event}</span>
                                                                                            {isDaily && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold border border-amber-200 shrink-0">
                                                                                                    <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Daily
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-4 px-5">
                                                                                        <div className="inline-flex items-start gap-1.5">
                                                                                            <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                                                                            {renderTimingMultiline(entry.timings)}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="py-6 text-sm text-slate-500 border-t border-slate-200 bg-white">
                <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                    <div>
                        © {new Date().getFullYear()} GTMM Trust. All rights reserved.
                    </div>
                    <div className="flex items-center space-x-6">
                        <Link to="/photos" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                            Photo Albums
                        </Link>
                        <Link to="/trust-details" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                            Trust Details
                        </Link>
                    </div>
                </div>
            </footer>

            {/* Floating Bottom Action Pill for Open Public Events (Option 2) */}
            <FloatingPublicEventPill events={publicEvents} formatDateStr={formatDateStr} />
        </div>
    );
}

export { PublicHomePage };
