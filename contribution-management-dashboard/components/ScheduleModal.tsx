import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Plus, Trash2, Calendar, Clock, Sparkles, ArrowUpDown, 
  Copy, Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown, 
  Download, Upload, Check, AlertCircle, Filter, RefreshCw
} from 'lucide-react';
import type { ScheduleMaster, ScheduleEntry, Festival } from '../types/index';
import { 
  sortScheduleEntries, 
  parseSpreadsheetTextToEntries, 
  exportEntriesToTsv 
} from '../utils/scheduleUtils';

interface FormEntry extends ScheduleEntry {
  _uid: string;
}

const createUid = (prefix: string = 'row'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ScheduleMaster, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: ScheduleMaster | null) => Promise<void>;
  itemToEdit: ScheduleMaster | null;
  festivals: Festival[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  itemToEdit,
  festivals
}) => {
  const [festivalId, setFestivalId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // UI States for managing long schedules
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteMode, setPasteMode] = useState<'append' | 'replace'>('append');
  const [pasteDefaultDate, setPasteDefaultDate] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (itemToEdit) {
      setFestivalId(itemToEdit.festivalId);
      setTitle(itemToEdit.title || '');
      const sDate = itemToEdit.startDate ? itemToEdit.startDate.split('T')[0] : '';
      const eDate = itemToEdit.endDate ? itemToEdit.endDate.split('T')[0] : '';
      setStartDate(sDate);
      setEndDate(eDate);
      setPasteDefaultDate(sDate);
      setIsActive(Boolean(itemToEdit.isActive));
      
      const loaded = itemToEdit.entries && itemToEdit.entries.length > 0 
        ? sortScheduleEntries(itemToEdit.entries).map((e, idx) => ({
            ...e,
            _uid: e.id ? `db-${e.id}` : createUid(`entry-${idx}`)
          }))
        : [{ _uid: createUid(), eventDate: sDate, day: '', event: '', timings: '' }];
      setEntries(loaded);
      
      // Auto-collapse master details if editing a long schedule (> 10 items) to prioritize entries view
      if (loaded.length >= 10) {
        setIsDetailsCollapsed(true);
      } else {
        setIsDetailsCollapsed(false);
      }
    } else {
      const defaultFestId = festivals.length > 0 ? festivals[0].id : '';
      setFestivalId(defaultFestId);
      setTitle('');
      setStartDate('');
      setEndDate('');
      setPasteDefaultDate('');
      setIsActive(true);
      setEntries([
        { _uid: createUid(), eventDate: '', day: '', event: '', timings: '' }
      ]);
      setIsDetailsCollapsed(false);
    }
    setError('');
    setSearchQuery('');
    setSelectedDateFilter('all');
    setIsPasteModalOpen(false);
  }, [itemToEdit, isOpen, festivals]);

  // Selected festival name
  const currentFestival = festivals.find(f => f.id === Number(festivalId));

  // Unique dates in the schedule for quick filtering
  const uniqueDates = useMemo(() => {
    const datesSet = new Set<string>();
    entries.forEach(e => {
      const d = e.eventDate ? e.eventDate.split('T')[0] : '';
      if (d) datesSet.add(d);
    });
    return Array.from(datesSet).sort();
  }, [entries]);

  // Filtered entries according to search query and date filter
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (selectedDateFilter !== 'all') {
      result = result.filter(e => {
        const d = e.eventDate ? e.eventDate.split('T')[0] : '';
        return d === selectedDateFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        (e.event && e.event.toLowerCase().includes(q)) ||
        (e.timings && e.timings.toLowerCase().includes(q)) ||
        (e.day && e.day.toLowerCase().includes(q)) ||
        (e.eventDate && e.eventDate.includes(q))
      );
    }
    return result;
  }, [entries, selectedDateFilter, searchQuery]);

  // Statistics
  const validEntriesCount = entries.filter(e => e.eventDate?.trim() && e.event?.trim() && e.timings?.trim()).length;
  const incompleteEntriesCount = entries.length - validEntriesCount;

  // Handlers
  const handleSortEntries = () => {
    setEntries(prev => {
      const sorted = sortScheduleEntries(prev);
      return sorted;
    });
  };

  const getNextDefaultDate = (): string => {
    if (selectedDateFilter !== 'all') return selectedDateFilter;
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      if (last.eventDate) return last.eventDate.split('T')[0];
    }
    return startDate || '';
  };

  const handleAddEntryRow = () => {
    const defaultDate = getNextDefaultDate();
    let defaultDay = '';
    if (defaultDate) {
      try {
        const d = new Date(defaultDate);
        if (!isNaN(d.getTime())) {
          defaultDay = d.toLocaleDateString('en-US', { weekday: 'long' });
        }
      } catch {
        // ignore
      }
    }

    const newRow: FormEntry = {
      _uid: createUid(),
      eventDate: defaultDate,
      day: defaultDay,
      event: '',
      timings: ''
    };
    setEntries(prev => [...prev, newRow]);

    // Scroll to bottom after adding
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleAddMultipleRows = (count: number = 5) => {
    const defaultDate = getNextDefaultDate();
    let defaultDay = '';
    if (defaultDate) {
      try {
        const d = new Date(defaultDate);
        if (!isNaN(d.getTime())) {
          defaultDay = d.toLocaleDateString('en-US', { weekday: 'long' });
        }
      } catch {
        // ignore
      }
    }

    const newRows: FormEntry[] = Array.from({ length: count }, (_, idx) => ({
      _uid: createUid(`batch-${idx}`),
      eventDate: defaultDate,
      day: defaultDay,
      event: '',
      timings: ''
    }));

    setEntries(prev => [...prev, ...newRows]);

    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleDuplicateRow = (uid: string) => {
    setEntries(prev => {
      const index = prev.findIndex(e => e._uid === uid);
      if (index === -1) return prev;
      const target = prev[index];
      const duplicated: FormEntry = {
        ...target,
        _uid: createUid('dup'),
        id: undefined // new entry
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicated);
      return updated;
    });
  };

  const handleRemoveEntryRow = (uid: string) => {
    setEntries(prev => prev.filter(e => e._uid !== uid));
  };

  const handleMoveRow = (uid: string, direction: 'up' | 'down') => {
    setEntries(prev => {
      const index = prev.findIndex(e => e._uid === uid);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const copy = [...prev];
      const [movedItem] = copy.splice(index, 1);
      copy.splice(newIndex, 0, movedItem);
      return copy;
    });
  };

  const handleEntryChange = (uid: string, field: keyof ScheduleEntry, value: string) => {
    setEntries(prev => {
      return prev.map(entry => {
        if (entry._uid !== uid) return entry;
        const updated = { ...entry, [field]: value };

        // Automatically fill Day if eventDate is updated
        if (field === 'eventDate' && value) {
          try {
            const dateObj = new Date(value);
            if (!isNaN(dateObj.getTime())) {
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
              if (!updated.day) {
                updated.day = dayName;
              }
            }
          } catch {
            // ignore
          }
        }
        return updated;
      });
    });
  };

  const handleCleanEmptyRows = () => {
    setEntries(prev => {
      const cleaned = prev.filter(e => e.eventDate?.trim() || e.event?.trim() || e.timings?.trim());
      if (cleaned.length === 0) {
        return [{ _uid: createUid(), eventDate: startDate || '', day: '', event: '', timings: '' }];
      }
      return cleaned;
    });
  };

  const handleCopyToClipboard = async () => {
    try {
      const tsv = exportEntriesToTsv(filteredEntries);
      await navigator.clipboard.writeText(tsv);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // Process pasted spreadsheet rows
  const handleApplyPaste = () => {
    if (!pasteRawText.trim()) return;
    const parsed = parseSpreadsheetTextToEntries(pasteRawText, pasteDefaultDate || startDate || '');
    if (parsed.length === 0) {
      alert('Could not detect any valid schedule rows from the pasted text. Please check format.');
      return;
    }

    const formEntries: FormEntry[] = parsed.map((item, idx) => ({
      ...item,
      _uid: createUid(`paste-${idx}`)
    }));

    if (pasteMode === 'replace') {
      setEntries(formEntries);
    } else {
      setEntries(prev => [...prev, ...formEntries]);
    }

    setPasteRawText('');
    setIsPasteModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivalId) {
      setError('Please select a festival');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please specify both Start Date and End Date');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start Date cannot be after End Date');
      return;
    }

    // Filter out completely empty entries and sort chronologically by date and time
    const cleanEntries = entries
      .filter(e => e.eventDate.trim() && e.event.trim() && e.timings.trim())
      .map(({ _uid, ...rest }) => rest);

    if (cleanEntries.length === 0) {
      setError('Please add at least one complete schedule entry with Date, Event name, and Timings.');
      return;
    }

    const validEntries = sortScheduleEntries(cleanEntries);

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(
        {
          festivalId: Number(festivalId),
          title: title.trim(),
          startDate,
          endDate,
          isActive,
          entries: validEntries
        },
        itemToEdit
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-wide truncate">
                  {itemToEdit ? 'Edit Festival Schedule' : 'Create Festival Schedule'}
                </h2>
                <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold text-white">
                  {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
                </span>
                {currentFestival && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 bg-amber-400 text-amber-950 font-bold rounded-full text-xs">
                    {currentFestival.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-100 truncate mt-0.5">
                {title ? `"${title}" • ` : ''}
                {startDate ? `${startDate} to ${endDate || '...'}` : 'Set dates & timings'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Create Schedule'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              type="button"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
          
          {/* Master Details Accordion */}
          <div className="border-b border-slate-200 bg-white shrink-0 shadow-xs">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDetailsCollapsed(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Festival Master Details
                  {isDetailsCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isDetailsCollapsed && (
                  <div className="text-xs text-slate-500 hidden md:flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {currentFestival?.name || 'No Festival selected'}
                    </span>
                    <span>•</span>
                    <span>{startDate || 'No date'} — {endDate || 'No date'}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsCollapsed(prev => !prev)}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                {isDetailsCollapsed ? 'Edit Festival & Dates' : 'Collapse Details'}
              </button>
            </div>

            {!isDetailsCollapsed && (
              <div className="px-6 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-slate-100 bg-slate-50/50">
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Festival <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={festivalId}
                    onChange={(e) => setFestivalId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-orange-500"
                    required
                  >
                    <option value="">-- Select Festival --</option>
                    {festivals.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Schedule Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Daily Programs"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!pasteDefaultDate) setPasteDefaultDate(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="lg:col-span-1 flex flex-col justify-end pb-1">
                  <label className="relative inline-flex items-center cursor-pointer gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-orange-600"></div>
                    <span className="text-xs font-semibold text-slate-800">
                      Active on Home
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Entries Control & Filter Bar */}
          <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Search & Date Filter */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, timings, days..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-1 focus:ring-orange-500"
                >
                  <option value="all">All Dates ({entries.length})</option>
                  {uniqueDates.map(date => {
                    const count = entries.filter(e => e.eventDate && e.eventDate.startsWith(date)).length;
                    return (
                      <option key={date} value={date}>
                        {date} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedDateFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('all')}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Bulk Actions Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors shadow-2xs"
                title="Paste multi-row schedule copied from Excel or Google Sheets"
              >
                <Upload className="w-3.5 h-3.5" /> Paste from Excel
              </button>

              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                title="Copy current schedule as spreadsheet text"
              >
                {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
                {copyFeedback ? 'Copied!' : 'Copy TSV'}
              </button>

              <button
                type="button"
                onClick={handleSortEntries}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition-colors"
                title="Automatically sort all entries chronologically by date and time"
              >
                <ArrowUpDown className="w-3.5 h-3.5" /> Sort by Time
              </button>

              {incompleteEntriesCount > 0 && (
                <button
                  type="button"
                  onClick={handleCleanEmptyRows}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
                  title="Remove empty rows"
                >
                  Clean Empty
                </button>
              )}

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              <button
                type="button"
                onClick={() => handleAddMultipleRows(5)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-orange-800 bg-orange-100/70 border border-orange-200 hover:bg-orange-200/70 rounded-lg transition-colors"
                title="Add 5 empty rows at once"
              >
                <Plus className="w-3.5 h-3.5" /> +5 Rows
              </button>

              <button
                type="button"
                onClick={handleAddEntryRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>

          {/* Schedule Entries Table (Scrollable with Sticky Header) */}
          <div ref={tableContainerRef} className="flex-1 overflow-y-auto min-h-0 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-medium">#</th>
                  <th className="py-2.5 px-3 w-36">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-500" /> Date
                    </span>
                  </th>
                  <th className="py-2.5 px-3 w-32">Day Name</th>
                  <th className="py-2.5 px-3">
                    <span>Event / Program Name <span className="text-red-500">*</span></span>
                  </th>
                  <th className="py-2.5 px-3 w-48">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-500" /> Timings <span className="text-red-500">*</span>
                    </span>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      {searchQuery || selectedDateFilter !== 'all' ? (
                        <div className="space-y-2">
                          <p>No entries match your search or date filter.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedDateFilter('all');
                            }}
                            className="text-orange-600 font-semibold underline text-xs"
                          >
                            Reset filters
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>No schedule entries added yet.</p>
                          <button
                            type="button"
                            onClick={handleAddEntryRow}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg font-bold text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add First Row
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, filteredIdx) => {
                    const masterIdx = entries.findIndex(e => e._uid === entry._uid);
                    const isRowValid = entry.eventDate?.trim() && entry.event?.trim() && entry.timings?.trim();

                    return (
                      <tr 
                        key={entry._uid} 
                        className={`transition-colors group ${
                          !isRowValid 
                            ? 'bg-amber-50/40 hover:bg-amber-50' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Index */}
                        <td className="p-2 text-center text-[11px] font-mono text-slate-400 group-hover:text-slate-600">
                          {masterIdx + 1}
                        </td>

                        {/* Date Picker */}
                        <td className="p-2">
                          <input
                            type="date"
                            value={entry.eventDate ? entry.eventDate.split('T')[0] : ''}
                            onChange={(e) => handleEntryChange(entry._uid, 'eventDate', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50/80 border border-slate-300 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-orange-500 focus:bg-white"
                          />
                        </td>

                        {/* Day Name */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={entry.day || ''}
                            onChange={(e) => handleEntryChange(entry._uid, 'day', e.target.value)}
                            placeholder="e.g. Day 1 / Mon"
                            className="w-full px-2.5 py-1.5 bg-slate-50/80 border border-slate-300 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-orange-500 focus:bg-white"
                          />
                        </td>

                        {/* Event Name */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={entry.event}
                            onChange={(e) => handleEntryChange(entry._uid, 'event', e.target.value)}
                            placeholder="e.g. Maha Aarti & Garba"
                            className="w-full px-2.5 py-1.5 bg-slate-50/80 border border-slate-300 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-orange-500 focus:bg-white font-medium"
                          />
                        </td>

                        {/* Timings */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={entry.timings}
                            onChange={(e) => handleEntryChange(entry._uid, 'timings', e.target.value)}
                            placeholder="e.g. 07:00 AM - 09:00 AM"
                            className="w-full px-2.5 py-1.5 bg-slate-50/80 border border-slate-300 rounded-md text-xs text-orange-700 font-semibold focus:ring-1 focus:ring-orange-500 focus:bg-white"
                          />
                        </td>

                        {/* Actions */}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Duplicate row */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(entry._uid)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Duplicate this entry (copies date, day, etc.)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Up/Down (disabled during search/filter to prevent confusion) */}
                            {!searchQuery && selectedDateFilter === 'all' && (
                              <>
                                <button
                                  type="button"
                                  disabled={masterIdx === 0}
                                  onClick={() => handleMoveRow(entry._uid, 'up')}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 transition-colors"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={masterIdx === entries.length - 1}
                                  onClick={() => handleMoveRow(entry._uid, 'down')}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 transition-colors"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleRemoveEntryRow(entry._uid)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              Total: <span className="font-bold text-slate-900">{entries.length}</span> rows
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-emerald-600">{validEntriesCount}</span> ready
              {incompleteEntriesCount > 0 && (
                <span className="text-amber-600 font-semibold ml-1">
                  ({incompleteEntriesCount} incomplete)
                </span>
              )}
            </span>

            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={handleAddEntryRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
              <button
                type="button"
                onClick={() => handleAddMultipleRows(5)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              >
                +5 Rows
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : itemToEdit ? 'Update Schedule' : 'Save Schedule'}
            </button>
          </div>
        </div>

        {/* Paste from Excel / Sheets Modal Overlay */}
        {isPasteModalOpen && (
          <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Paste Schedule from Excel / Google Sheets</h3>
                    <p className="text-[11px] text-indigo-100">
                      Copy rows directly from your spreadsheet and paste them below
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                  <p className="font-semibold">Supported column arrangements:</p>
                  <ul className="list-disc list-inside text-[11px] text-indigo-800 space-y-0.5">
                    <li><span className="font-mono">Date | Day | Event / Program | Timings</span> (e.g., copied from 4 columns in Excel)</li>
                    <li><span className="font-mono">Date | Event / Program | Timings</span></li>
                    <li><span className="font-mono">Event / Program | Timings</span> (will use the default date below)</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Date (for rows without dates)
                    </label>
                    <input
                      type="date"
                      value={pasteDefaultDate}
                      onChange={(e) => setPasteDefaultDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Import Mode
                    </label>
                    <div className="flex items-center gap-4 pt-1">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="pasteMode"
                          value="append"
                          checked={pasteMode === 'append'}
                          onChange={() => setPasteMode('append')}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        Append to existing ({entries.length})
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="pasteMode"
                          value="replace"
                          checked={pasteMode === 'replace'}
                          onChange={() => setPasteMode('replace')}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        Replace all entries
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paste Spreadsheet Content Here:
                  </label>
                  <textarea
                    rows={8}
                    value={pasteRawText}
                    onChange={(e) => setPasteRawText(e.target.value)}
                    placeholder="2026-10-15	Day 1	Maha Aarti	07:00 AM - 08:00 AM&#10;2026-10-15	Day 1	Satsang & Bhajan	10:00 AM - 12:00 PM&#10;2026-10-15	Day 1	Mahaprasad Lunch	12:30 PM - 02:00 PM&#10;2026-10-15	Day 1	Cultural Program & Garba	07:30 PM - 10:30 PM"
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {pasteRawText.trim() && (
                  <div className="text-xs text-slate-600 font-medium">
                    Detected: <span className="font-bold text-indigo-600">
                      {parseSpreadsheetTextToEntries(pasteRawText, pasteDefaultDate || startDate || '').length}
                    </span> rows
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPaste}
                  disabled={!pasteRawText.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  Import Entries
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
