import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock, Sparkles } from 'lucide-react';
import type { ScheduleMaster, ScheduleEntry, Festival } from '../types/index';

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
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setFestivalId(itemToEdit.festivalId);
      setTitle(itemToEdit.title || '');
      setStartDate(itemToEdit.startDate ? itemToEdit.startDate.split('T')[0] : '');
      setEndDate(itemToEdit.endDate ? itemToEdit.endDate.split('T')[0] : '');
      setIsActive(Boolean(itemToEdit.isActive));
      setEntries(itemToEdit.entries ? [...itemToEdit.entries] : []);
    } else {
      setFestivalId(festivals.length > 0 ? festivals[0].id : '');
      setTitle('');
      setStartDate('');
      setEndDate('');
      setIsActive(true);
      setEntries([
        { eventDate: '', day: '', event: '', timings: '' }
      ]);
    }
    setError('');
  }, [itemToEdit, isOpen, festivals]);

  if (!isOpen) return null;

  const handleAddEntryRow = () => {
    setEntries(prev => [
      ...prev,
      { eventDate: startDate || '', day: '', event: '', timings: '' }
    ]);
  };

  const handleRemoveEntryRow = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, field: keyof ScheduleEntry, value: string) => {
    setEntries(prev => {
      const updated = [...prev];
      const entry = { ...updated[index], [field]: value };

      // Automatically fill Day if eventDate is picked and day is empty
      if (field === 'eventDate' && value) {
        try {
          const dateObj = new Date(value);
          if (!isNaN(dateObj.getTime())) {
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            if (!entry.day) {
              entry.day = dayName;
            }
          }
        } catch {
          // ignore
        }
      }

      updated[index] = entry;
      return updated;
    });
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

    // Filter out completely empty entries
    const validEntries = entries.filter(e => e.eventDate.trim() && e.event.trim() && e.timings.trim());

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide">
                {itemToEdit ? 'Edit Festival Schedule' : 'Create New Festival Schedule'}
              </h2>
              <p className="text-xs text-orange-100 mt-0.5">
                Manage schedule master details and event timings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Schedule Master Fields */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" /> Schedule Master Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Festival <span className="text-red-500">*</span>
                </label>
                <select
                  value={festivalId}
                  onChange={(e) => setFestivalId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="">-- Select Festival --</option>
                  {festivals.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Schedule Title / Label
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Daily Program Schedule"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <label className="relative inline-flex items-center cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                <span className="text-sm font-semibold text-slate-800">
                  Mark as Active Schedule
                </span>
              </label>
              <span className="text-xs text-slate-500">
                (Active schedules will be displayed on the public Home Page)
              </span>
            </div>
          </div>

          {/* Schedule Entries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" /> Schedule Entries & Timings
              </h3>
              <button
                type="button"
                onClick={handleAddEntryRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-36">Date</th>
                      <th className="py-2.5 px-3 w-32">Day</th>
                      <th className="py-2.5 px-3">Event / Program</th>
                      <th className="py-2.5 px-3 w-48">Timings</th>
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 text-xs italic">
                          No schedule entries added yet. Click &quot;Add Row&quot; above to add events.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2">
                            <input
                              type="date"
                              value={entry.eventDate ? entry.eventDate.split('T')[0] : ''}
                              onChange={(e) => handleEntryChange(idx, 'eventDate', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:bg-white"
                              placeholder="YYYY-MM-DD"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={entry.day || ''}
                              onChange={(e) => handleEntryChange(idx, 'day', e.target.value)}
                              placeholder="e.g. Day 1 / Mon"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={entry.event}
                              onChange={(e) => handleEntryChange(idx, 'event', e.target.value)}
                              placeholder="e.g. Maha Aarti & Cultural Show"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={entry.timings}
                              onChange={(e) => handleEntryChange(idx, 'timings', e.target.value)}
                              placeholder="e.g. 07:00 AM - 09:00 AM"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:bg-white"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEntryRow(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : itemToEdit ? 'Update Schedule' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
