import React, { useState, useMemo } from 'react';
import { 
  Calendar, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Clock, Sparkles, AlertCircle, History, Copy, Check, Search, 
  ChevronDown, ChevronUp, Download, Sun, Moon
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { ScheduleModal } from '../components/ScheduleModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TodayScheduleView } from '../components/TodayScheduleView';
import type { ScheduleMaster, ScheduleEntry } from '../types';
import { API_URL } from '../config';
import { 
  sortSchedules, 
  exportEntriesToTsv, 
  getDailyRecurringEvents, 
  isDailyRecurringEvent 
} from '../utils/scheduleUtils';

interface ScheduleCardItemProps {
  sched: ScheduleMaster;
  canEdit: boolean;
  canDelete: boolean;
  onToggleActive: (sched: ScheduleMaster) => void;
  onOpenEdit: (sched: ScheduleMaster) => void;
  onOpenHistory: (id: number, title: string) => void;
  onRequestDelete: (sched: ScheduleMaster) => void;
  formatDateStr: (dateStr: string) => string;
}

const ScheduleCardItem: React.FC<ScheduleCardItemProps> = ({
  sched,
  canEdit,
  canDelete,
  onToggleActive,
  onOpenEdit,
  onOpenHistory,
  onRequestDelete,
  formatDateStr
}) => {
  const [cardSearch, setCardSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawEntries = sched.entries || [];

  // Identify the 2 everyday events throughout the festival
  const dailyEvents = useMemo(() => {
    return getDailyRecurringEvents(rawEntries);
  }, [rawEntries]);

  const filteredEntries = useMemo(() => {
    if (!cardSearch.trim()) return rawEntries;
    const q = cardSearch.toLowerCase().trim();
    return rawEntries.filter(e => 
      (e.event && e.event.toLowerCase().includes(q)) ||
      (e.timings && e.timings.toLowerCase().includes(q)) ||
      (e.day && e.day.toLowerCase().includes(q)) ||
      (e.eventDate && e.eventDate.includes(q))
    );
  }, [rawEntries, cardSearch]);

  const handleCopyTsv = async () => {
    try {
      const tsv = exportEntriesToTsv(rawEntries);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const hasManyEntries = rawEntries.length > 8;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden ${
        sched.isActive ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-slate-200'
      }`}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="space-y-1 min-w-[240px]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md">
              {sched.festivalName || 'Festival'}
            </span>
            {sched.title && (
              <h3 className="text-lg font-bold text-slate-900">{sched.title}</h3>
            )}
            {sched.isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active Schedule
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                <XCircle className="w-3.5 h-3.5" /> Inactive
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Duration:</span>{' '}
            {formatDateStr(sched.startDate)} — {formatDateStr(sched.endDate)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => onToggleActive(sched)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                sched.isActive
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
              title="Toggle Active Status"
            >
              {sched.isActive ? 'Deactivate' : 'Set Active'}
            </button>
          )}

          <button
            onClick={() => onOpenHistory(sched.id, `History: ${sched.festivalName || 'Schedule'} (${sched.title || 'Master'})`)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Change History"
          >
            <History className="w-4 h-4" />
          </button>

          {canEdit && (
            <button
              onClick={() => onOpenEdit(sched)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors shadow-2xs"
              title="Edit Schedule & Entries"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Schedule
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => onRequestDelete(sched)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Schedule"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Entries Table */}
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" /> Event Timings
            </h4>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold">
              {rawEntries.length} {rawEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {rawEntries.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Card Filter Input */}
              {rawEntries.length > 5 && (
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    placeholder="Filter events..."
                    className="pl-6 pr-5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 w-36 sm:w-44"
                  />
                  {cardSearch && (
                    <button
                      onClick={() => setCardSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Copy TSV */}
              <button
                type="button"
                onClick={handleCopyTsv}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                title="Copy schedule to Excel (TSV)"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              {/* Expand / Collapse toggle for long schedules */}
              {hasManyEntries && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(prev => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-md transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" /> Compact
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" /> View All ({rawEntries.length})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Daily Recurring Events Displayed on Top of the Events Table */}
        {dailyEvents.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/90 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-200/80 rounded-md text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Daily Recurring Events (Everyday of Festival)
                  </span>
                  <span className="text-[11px] text-amber-800 ml-2 hidden sm:inline">
                    Held everyday throughout the festival celebration
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-950 rounded-full uppercase tracking-wider shrink-0">
                Everyday
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {dailyEvents.map((de, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-white/95 rounded-lg border border-amber-200/70 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {idx === 0 ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{de.event}</div>
                      <div className="text-[10px] text-slate-500">
                        {idx === 0 ? 'Morning Program' : 'Evening Program'} • Repeats Daily
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 shrink-0 ml-2">
                    {de.timings}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rawEntries.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs text-slate-400 italic">No event entries defined for this schedule.</p>
            {canEdit && (
              <button
                onClick={() => onOpenEdit(sched)}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Event Entries
              </button>
            )}
          </div>
        ) : (
          <div 
            className={`border border-slate-200 rounded-xl overflow-x-auto ${
              !isExpanded && hasManyEntries ? 'max-h-80 overflow-y-auto' : ''
            }`}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center text-slate-400">#</th>
                  <th className="py-2.5 px-3 w-36">Date</th>
                  <th className="py-2.5 px-3 w-28">Day</th>
                  <th className="py-2.5 px-3">Event / Program</th>
                  <th className="py-2.5 px-3 w-48">Timings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs italic">
                      No events matched &quot;{cardSearch}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => {
                    const isDaily = isDailyRecurringEvent(entry, dailyEvents);

                    return (
                      <tr key={entry.id || idx} className={`transition-colors ${isDaily ? 'bg-amber-50/20 hover:bg-amber-50/50' : 'hover:bg-orange-50/40'}`}>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateStr(entry.eventDate)}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {entry.day || '—'}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{entry.event}</span>
                            {isDaily && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px] font-bold border border-amber-200 shrink-0">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Daily
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-orange-700 font-semibold whitespace-nowrap">
                          {entry.timings}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const Schedules: React.FC = () => {
  const { 
    schedules, 
    festivals, 
    handleScheduleSubmit, 
    handleToggleScheduleActive, 
    fetchData 
  } = useData();
  const { hasPermission, token, logout } = useAuth();
  const { openHistoryModal } = useModal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleMaster | null>(null);

  // Tab state: 'today' (default) or 'full'
  const [activeTab, setActiveTab] = useState<'today' | 'full'>('today');

  // Delete modal state
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedSchedules = useMemo(() => sortSchedules(schedules), [schedules]);

  const canCreate = hasPermission('action:create');
  const canEdit = hasPermission('action:edit');
  const canDelete = hasPermission('action:delete');

  const handleOpenCreate = () => {
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sched: ScheduleMaster) => {
    setSelectedSchedule(sched);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (sched: ScheduleMaster) => {
    if (!canEdit) return;
    await handleToggleScheduleActive(sched.id, !sched.isActive);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/schedules/${scheduleToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) { logout(); return; }
      if (!response.ok) throw new Error('Failed to delete schedule');
      await fetchData();
      setScheduleToDelete(null);
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      alert('Failed to delete schedule.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 text-orange-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-200" /> Event Management
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Festival Schedules</h1>
          <p className="text-orange-100 text-sm mt-1 max-w-xl">
            Create, update, and manage detailed festival event schedules. Active schedules are automatically featured on the public home page.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-orange-600 font-bold text-sm rounded-xl shadow-md hover:bg-orange-50 transition-all hover:shadow-lg active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> Create Schedule
          </button>
        )}
      </div>

      {/* Tab Navigation: Today's Events (Default) vs Full Schedule */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'today'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Today&apos;s Events
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              activeTab === 'today' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-800'
            }`}>
              Default
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('full')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'full'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Full Schedule
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'full' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {sortedSchedules.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          {activeTab === 'today' ? (
            <span>Showing today&apos;s program & daily recurring events</span>
          ) : (
            <span>Showing complete festival schedules & timetables</span>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'today' ? (
        <TodayScheduleView
          schedules={sortedSchedules}
          canEdit={canEdit}
          onOpenEdit={handleOpenEdit}
          onViewFullSchedule={() => setActiveTab('full')}
          formatDateStr={formatDateStr}
        />
      ) : (
        /* Full Schedule View */
        sortedSchedules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 mx-auto bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-800">No Schedules Created</h3>
              <p className="text-sm text-slate-500 mt-1">
                There are currently no festival schedules defined. As a Manager, you can create master schedules and add daily event timings.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors shadow"
              >
                <Plus className="w-4 h-4" /> Create First Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {sortedSchedules.map((sched) => (
              <ScheduleCardItem
                key={sched.id}
                sched={sched}
                canEdit={canEdit}
                canDelete={canDelete}
                onToggleActive={handleToggleActive}
                onOpenEdit={handleOpenEdit}
                onOpenHistory={(id, title) => openHistoryModal('schedules', id, title)}
                onRequestDelete={(s) => setScheduleToDelete(s)}
                formatDateStr={formatDateStr}
              />
            ))}
          </div>
        )
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleScheduleSubmit}
        itemToEdit={selectedSchedule}
        festivals={festivals}
      />

      {/* Delete Confirmation Modal */}
      {scheduleToDelete && (
        <ConfirmationModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setScheduleToDelete(null)}
          message={`Are you sure you want to delete the schedule for "${scheduleToDelete.festivalName || 'this festival'}"? This action can be restored from the Archive page.`}
          confirmText="Delete Schedule"
        />
      )}
    </div>
  );
};
