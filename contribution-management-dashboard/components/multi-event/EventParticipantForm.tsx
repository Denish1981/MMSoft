import React from 'react';
import { 
    Users, Plus, Trash2, Copy, Check, UserPlus, 
    Calendar, Building2, Sparkles, AlertCircle, Info 
} from 'lucide-react';
import type { PublicEvent } from '../RegistrationModal';
import { EventParticipantEntry, RosterMember, PrimaryContactData } from './types';

interface EventParticipantFormProps {
    event: PublicEvent;
    participants: EventParticipantEntry[];
    allSelectedEvents: PublicEvent[];
    familyRoster: RosterMember[];
    primaryContact: PrimaryContactData;
    onAddParticipant: (eventId: number) => void;
    onRemoveParticipant: (eventId: number, participantIndex: number) => void;
    onParticipantChange: (eventId: number, participantIndex: number, field: string, value: any) => void;
    onSelectRosterMember: (eventId: number, participantIndex: number, rosterMemberId: string) => void;
    onCopyParticipantsFromEvent: (targetEventId: number, sourceEventId: number) => void;
    onApplyHouseholdRosterToAllEvents: () => void;
    copiedFromEventId: number | null;
}

export const EventParticipantForm: React.FC<EventParticipantFormProps> = ({
    event,
    participants,
    allSelectedEvents,
    familyRoster,
    primaryContact,
    onAddParticipant,
    onRemoveParticipant,
    onParticipantChange,
    onSelectRosterMember,
    onCopyParticipantsFromEvent,
    onApplyHouseholdRosterToAllEvents,
    copiedFromEventId,
}) => {
    const validRosterMembers = familyRoster.filter(m => m.name.trim() !== '');

    const renderSchemaInput = (field: any, pIdx: number, val: any) => {
        const fieldName = field.name;
        const fieldType = field.type || 'text';
        const isReq = field.required;

        if (fieldType === 'select' && Array.isArray(field.options)) {
            return (
                <select
                    value={val || ''}
                    onChange={(e) => onParticipantChange(event.id, pIdx, fieldName, e.target.value)}
                    required={isReq}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                    <option value="">-- Select {field.label} --</option>
                    {field.options.map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        if (fieldType === 'textarea') {
            return (
                <textarea
                    rows={2}
                    value={val || ''}
                    onChange={(e) => onParticipantChange(event.id, pIdx, fieldName, e.target.value)}
                    placeholder={field.placeholder || ''}
                    required={isReq}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
            );
        }

        return (
            <input
                type={fieldType === 'number' ? 'number' : fieldType === 'email' ? 'email' : 'text'}
                value={val || ''}
                onChange={(e) => onParticipantChange(event.id, pIdx, fieldName, e.target.value)}
                placeholder={field.placeholder || ''}
                required={isReq}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            {/* Header banner for event */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <h4 className="text-base font-bold text-slate-900">{event.name}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                            {participants.length} Participant{participants.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span><Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{event.eventDate}</span>
                        {event.venue && <span><Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{event.venue}</span>}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Copy participants dropdown */}
                    {allSelectedEvents.length > 1 && (
                        <div className="relative">
                            <select
                                onChange={(e) => {
                                    const srcId = Number(e.target.value);
                                    if (srcId) {
                                        onCopyParticipantsFromEvent(event.id, srcId);
                                        e.target.value = '';
                                    }
                                }}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer"
                            >
                                <option value="">📋 Copy members from...</option>
                                {allSelectedEvents
                                    .filter(e => e.id !== event.id)
                                    .map(otherEvt => (
                                        <option key={otherEvt.id} value={otherEvt.id}>
                                            {otherEvt.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Apply Household Roster Button */}
                    {validRosterMembers.length > 0 && (
                        <button
                            type="button"
                            onClick={onApplyHouseholdRosterToAllEvents}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
                            title="Auto-fill all saved household roster members into this event"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Auto-fill Household Roster
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onAddParticipant(event.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Participant
                    </button>
                </div>
            </div>

            {copiedFromEventId === event.id && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    Participants copied successfully!
                </div>
            )}

            {/* Participants list */}
            <div className="space-y-4">
                {participants.map((p, pIdx) => (
                    <div 
                        key={p.id || pIdx}
                        className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 relative"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                    {pIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                    Participant #{pIdx + 1}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Pick from Saved Household Roster dropdown */}
                                {validRosterMembers.length > 0 && (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                onSelectRosterMember(event.id, pIdx, e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg outline-none cursor-pointer hover:border-blue-400"
                                    >
                                        <option value="">👤 Select from Household Roster</option>
                                        {validRosterMembers.map(rm => (
                                            <option key={rm.id} value={rm.id}>
                                                {rm.name} {rm.phone ? `(${rm.phone})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {participants.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveParticipant(event.id, pIdx)}
                                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                        title="Remove Participant"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Standard Participant Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={p.name || ''}
                                    onChange={(e) => onParticipantChange(event.id, pIdx, 'name', e.target.value)}
                                    placeholder="Participant full name"
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={p.phone || ''}
                                    onChange={(e) => onParticipantChange(event.id, pIdx, 'phone', e.target.value)}
                                    placeholder="Phone number"
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={p.email || ''}
                                    onChange={(e) => onParticipantChange(event.id, pIdx, 'email', e.target.value)}
                                    placeholder="Email address"
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Dynamic Custom Fields from Event Schema */}
                        {Array.isArray(event.registrationFormSchema) && event.registrationFormSchema.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {event.registrationFormSchema.map((field: any, fIdx: number) => {
                                    // Skip basic fields if schema repeats them
                                    const fieldName = (field.name || '').toLowerCase();
                                    if (fieldName === 'name' || fieldName === 'fullname' || fieldName === 'participantname') return null;

                                    return (
                                        <div key={fIdx}>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                                            </label>
                                            {renderSchemaInput(field, pIdx, p[field.name])}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
