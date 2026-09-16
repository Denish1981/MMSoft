import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, Sun, Moon, Sparkles, ChevronLeft, ChevronRight, 
  Copy, Check, Edit2, ArrowRight, CheckCircle2, ListFilter
} from 'lucide-react';
import type { ScheduleMaster, ScheduleEntry } from '../types';
import { 
  getDailyRecurringEvents, 
  isDailyRecurringEvent, 
  sortScheduleEntries,
  parseTimeStringToMinutes,
  DailyEventSummary 
} from '../utils/scheduleUtils';

interface TodayScheduleViewProps {
  schedules: ScheduleMaster[];
  canEdit: boolean;
  onOpenEdit: (sched: ScheduleMaster) => void;
  onViewFullSchedule: () => void;
  formatDateStr: (dateStr: string) => string;
}

export const TodayScheduleView: React.FC<TodayScheduleViewProps> = ({
  schedules,
  canEdit,
  onOpenEdit,
  onViewFullSchedule,
  formatDateStr
}) => {
  // Find active schedule or fallback to first schedule
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

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Distinct dates in the current schedule
  const scheduleDates = useMemo(() => {
    if (!currentSchedule || !currentSchedule.entries) return [];
    const set = new Set<string>();
    currentSchedule.entries.forEach(e => {
      const d = e.eventDate ? e.eventDate.split('T')[0] : '';
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [currentSchedule]);

  // Determine initial selected date: today if present, else first available date
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Keep selectedDate in sync when schedule changes
  React.useEffect(() => {
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
    // Check if any entry on this date has a day string
    const entryWithDay = dayEvents.find(e => e.day && e.day.trim());
    if (entryWithDay && entryWithDay.day) return entryWithDay.day;

    try {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'long' });
      }
    } catch {
      // ignore
    }
    return '';
  }, [selectedDate, dayEvents]);

  const isSelectedToday = selectedDate === todayStr;

  // Selected date index for navigation
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

    lines.push('📋 Schedule for Today:');
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
          There is no festival schedule created yet. Click below to view all schedules or create a new one.
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
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-md uppercase tracking-wider">
                {currentSchedule.festivalName || 'Festival Celebration'}
              </span>
              {currentSchedule.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active Festival
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  Inactive
                </span>
              )}
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
                    {s.festivalName || 'Schedule'} {s.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleCopyDaySchedule}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors cursor-pointer"
              title="Copy today's schedule to share"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Share Day'}
            </button>

            {canEdit && (
              <button
                onClick={() => onOpenEdit(currentSchedule)}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-orange-200 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-xl transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}

            <button
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
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-200/80 rounded-lg text-amber-900">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                      Daily Recurring Events (Everyday of Festival)
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      These 2 events take place everyday throughout the course of the festival celebration.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-200/80 text-amber-950 font-bold text-[10px] rounded-full uppercase tracking-wider shrink-0">
                  Everyday
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dailyEvents.map((de, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/95 rounded-xl border border-amber-200/80 shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        idx === 0 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {idx === 0 ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">
                          {de.event}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {idx === 0 ? 'Morning Program' : 'Evening Program'} • Repeats Daily
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 shrink-0 ml-3">
                      {de.timings}
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
                className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
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
                {canEdit && (
                  <button
                    onClick={() => onOpenEdit(currentSchedule)}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700"
                  >
                    Add Events to Schedule
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-4 w-12 text-center text-slate-400">#</th>
                      <th className="py-2.5 px-4 w-48">Timings</th>
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
                          <td className="py-3 px-4 font-bold text-orange-700 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              {entry.timings}
                            </span>
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
