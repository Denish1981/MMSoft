import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, Ticket } from 'lucide-react';
import { RosterMemberItem } from '../../types/auth';
import { API_URL } from '../../config';

export interface EventOption {
    id: number;
    name: string;
    eventDate: string;
    venue?: string;
    description?: string;
}

export interface ExistingRegistration {
    id: number;
    eventId: number;
    eventName?: string;
    name?: string;
    email?: string;
    formData?: Record<string, any>;
}

interface MemberEventRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: RosterMemberItem | null;
    events: EventOption[];
    existingRegistrations: ExistingRegistration[];
    token: string | null;
    hasApprovedContribution: boolean;
    onSuccess: () => void;
}

export const MemberEventRegistrationModal: React.FC<MemberEventRegistrationModalProps> = ({
    isOpen,
    onClose,
    member,
    events,
    existingRegistrations,
    token,
    hasApprovedContribution,
    onSuccess
}) => {
    const [selectedEventIds, setSelectedEventIds] = useState<number[]>([]);
    const [initialEventIds, setInitialEventIds] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isOpen && member) {
            setSubmitError('');
            setSuccessMessage('');
            
            // Find events that this member is currently registered for
            const memberNameClean = (member.name || '').trim().toLowerCase();
            const memberPhoneClean = (member.phone || '').trim();
            const memberEmailClean = (member.email || '').trim().toLowerCase();

            const matchedEventIds: number[] = [];
            existingRegistrations.forEach(reg => {
                const regName = (
                    reg.name || 
                    reg.formData?.name || 
                    reg.formData?.fullName || 
                    reg.formData?.participantName || 
                    reg.formData?.registrant_name ||
                    reg.formData?.registrantName ||
                    ''
                ).trim().toLowerCase();

                const regPhone = (reg.formData?.phone_number || reg.formData?.contact_number || reg.formData?.mobile_number || reg.formData?.phone || '').trim();
                const regEmail = (reg.email || reg.formData?.email || '').trim().toLowerCase();

                let isMatch = false;
                if (memberNameClean && regName) {
                    // Match strictly by member name to avoid matching family members who share phone or email
                    isMatch = (regName === memberNameClean);
                } else if (!regName && memberPhoneClean && regPhone) {
                    isMatch = (memberPhoneClean === regPhone);
                } else if (!regName && memberEmailClean && regEmail) {
                    isMatch = (memberEmailClean === regEmail);
                }

                if (isMatch && reg.eventId) {
                    matchedEventIds.push(Number(reg.eventId));
                }
            });

            const uniqueMatchedIds = Array.from(new Set(matchedEventIds));
            setSelectedEventIds(uniqueMatchedIds);
            setInitialEventIds(uniqueMatchedIds);
        }
    }, [isOpen, member, existingRegistrations]);

    if (!isOpen || !member) return null;

    const handleToggleEvent = (eventId: number) => {
        setSelectedEventIds(prev => 
            prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
        );
    };

    const handleSelectAll = () => {
        setSelectedEventIds(events.map(e => e.id));
    };

    const handleDeselectAll = () => {
        setSelectedEventIds([]);
    };

    const handleSubmit = async () => {
        setSubmitError('');
        setSuccessMessage('');

        if (!hasApprovedContribution) {
            setSubmitError('You must have at least one approved contribution to register for events.');
            return;
        }

        if (!member.name || !member.name.trim()) {
            setSubmitError('Member name is required.');
            return;
        }

        setIsSubmitting(true);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/donor/member-events`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    memberName: member.name,
                    memberPhone: member.phone || '',
                    memberEmail: member.email || '',
                    selectedEventIds: selectedEventIds
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update event registrations.');
            }

            setSuccessMessage(`Event registrations updated successfully for ${member.name}!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);

        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'An error occurred while saving registrations.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDirty = JSON.stringify([...selectedEventIds].sort()) !== JSON.stringify([...initialEventIds].sort());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold leading-snug">
                                Register Events for <span className="text-blue-300">{member.name || 'Member'}</span>
                            </h3>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Select or deselect events for this household member.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Member Details pill */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Member: <strong className="text-slate-900">{member.name}</strong>
                    </span>
                    {(member.phone || member.email) && (
                        <span className="text-slate-500">
                            {member.phone}{member.phone && member.email ? ' • ' : ''}{member.email}
                        </span>
                    )}
                </div>

                {/* Content Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {!hasApprovedContribution && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <strong>Contribution Required:</strong> You need to have an approved contribution to register household members for events.
                            </div>
                        </div>
                    )}

                    {submitError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{submitError}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {events.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-600">No active events found</p>
                            <p className="text-[11px] text-slate-400 mt-1">There are currently no upcoming events available for registration.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                                <span>Check the events to register:</span>
                                <div className="flex items-center gap-3 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                    >
                                        Select All
                                    </button>
                                    <span>•</span>
                                    <button
                                        type="button"
                                        onClick={handleDeselectAll}
                                        className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {events.map((evt) => {
                                    const isSelected = selectedEventIds.includes(evt.id);
                                    const isInitiallyRegistered = initialEventIds.includes(evt.id);

                                    return (
                                        <label
                                            key={evt.id}
                                            onClick={() => handleToggleEvent(evt.id)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                                isSelected
                                                    ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                                                    : 'bg-white hover:bg-slate-50 border-slate-200'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}} // Handled by container click
                                                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                                        {evt.name}
                                                    </span>
                                                    {isInitiallyRegistered && (
                                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                                            Currently Registered
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                                                    {evt.eventDate && (
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Calendar className="w-3 h-3 text-blue-600" />
                                                            {new Date(evt.eventDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {evt.venue && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 text-slate-400" />
                                                            {evt.venue}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                        {selectedEventIds.length} event{selectedEventIds.length !== 1 ? 's' : ''} selected
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-sm transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasApprovedContribution}
                            className={`px-5 py-2 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                hasApprovedContribution
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Ticket className="w-3.5 h-3.5" /> Register
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
