import React, { useState } from 'react';
import { 
  Calendar, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Clock, Sparkles, AlertCircle, History
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { ScheduleModal } from '../components/ScheduleModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import type { ScheduleMaster } from '../types';
import { API_URL } from '../config';

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

  // Delete modal state
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

      {/* Schedules List */}
      {schedules.length === 0 ? (
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
          {schedules.map((sched) => (
            <div
              key={sched.id}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden ${
                sched.isActive ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">
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
                    <span className="font-medium text-slate-700">Duration:</span>{' '}
                    {formatDateStr(sched.startDate)} — {formatDateStr(sched.endDate)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => handleToggleActive(sched)}
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
                    onClick={() => openHistoryModal('schedules', sched.id, `History: ${sched.festivalName || 'Schedule'} (${sched.title || 'Master'})`)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View Change History"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(sched)}
                      className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Edit Schedule"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => setScheduleToDelete(sched)}
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
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-500" /> Event Timings ({sched.entries?.length || 0} entries)
                  </h4>
                </div>

                {!sched.entries || sched.entries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No event entries defined for this schedule.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4 w-36">Date</th>
                          <th className="py-2.5 px-4 w-28">Day</th>
                          <th className="py-2.5 px-4">Event</th>
                          <th className="py-2.5 px-4 w-48">Timings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {sched.entries.map((entry, idx) => (
                          <tr key={entry.id || idx} className="hover:bg-orange-50/30 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-800">
                              {formatDateStr(entry.eventDate)}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {entry.day || '—'}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {entry.event}
                            </td>
                            <td className="py-2.5 px-4 text-orange-700 font-semibold">
                              {entry.timings}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
