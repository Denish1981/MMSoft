import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, Ticket, Phone, Mail, User, Users, Info, Clock, BookOpen, ExternalLink } from 'lucide-react';
import { RosterMemberItem } from '../../types/auth';
import { API_URL } from '../../config';
import { isEventRegistrationClosed } from '../../types/events';

export interface EventContactPersonItem {
    name: string;
    contactNumber?: string;
    email?: string;
}

export interface EventOption {
    id: number;
    name: string;
    eventDate: string;
    venue?: string;
    description?: string;
    rules?: string | null;
    image?: string;
    startTime?: string;
    endTime?: string | null;
    registrationDeadline?: string | null;
    contactPersons?: EventContactPersonItem[];
    registrationFormSchema?: any[];
    festivalId?: number;
    festivalName?: string;
    isGroupEvent?: boolean;
    minGroupSize?: number;
    maxGroupSize?: number;
    allowDuplicateMembers?: boolean;
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
    const [eventGroupData, setEventGroupData] = useState<Record<number, { groupName: string; groupMembers: Array<{ name: string; towerNumber: string; flatNumber: string; phone?: string; role?: string }> }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [activeContactPopoverId, setActiveContactPopoverId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && member) {
            setSubmitError('');
            setSuccessMessage('');
            
            // Find events that this member is currently registered for
            const memberNameClean = (member.name || '').trim().toLowerCase();
            const memberPhoneClean = (member.phone || '').trim();
            const memberEmailClean = (member.email || '').trim().toLowerCase();

            const matchedEventIds: number[] = [];
            const initialGroupData: Record<number, { groupName: string; groupMembers: Array<{ name: string; towerNumber: string; flatNumber: string; phone?: string; role?: string }> }> = {};

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
                    const evtId = Number(reg.eventId);
                    matchedEventIds.push(evtId);
                    
                    const existingGroupName = reg.formData?.group_name || reg.formData?.groupName || '';
                    const existingGroupMembers = reg.formData?.group_members || reg.formData?.groupMembers || [];
                    if (existingGroupName || existingGroupMembers.length > 0) {
                        const parsedMembers = (Array.isArray(existingGroupMembers) ? existingGroupMembers : []).map((m: any) => {
                            if (typeof m === 'string') {
                                return { name: m, towerNumber: '', flatNumber: '', phone: '' };
                            }
                            return {
                                name: m?.name || '',
                                towerNumber: m?.towerNumber || m?.tower_number || m?.tower || '',
                                flatNumber: m?.flatNumber || m?.flat_number || m?.flat || '',
                                phone: m?.phone || m?.phone_number || m?.mobile_number || '',
                                role: m?.role || ''
                            };
                        });

                        initialGroupData[evtId] = {
                            groupName: existingGroupName,
                            groupMembers: parsedMembers
                        };
                    }
                }
            });

            const uniqueMatchedIds = Array.from(new Set(matchedEventIds));
            setSelectedEventIds(uniqueMatchedIds);
            setInitialEventIds(uniqueMatchedIds);
            setEventGroupData(initialGroupData);
        }
    }, [isOpen, member, existingRegistrations]);

    if (!isOpen || !member) return null;

    const handleToggleEvent = (eventId: number) => {
        const evt = events.find(e => e.id === eventId);
        const isClosed = evt ? isEventRegistrationClosed(evt.registrationDeadline, evt.eventDate) : false;
        const isCurrentlyRegistered = initialEventIds.includes(eventId);

        // If closed and not currently registered, don't allow checking
        if (isClosed && !isCurrentlyRegistered && !selectedEventIds.includes(eventId)) {
            return;
        }

        setSelectedEventIds(prev => {
            const isRemoving = prev.includes(eventId);
            if (isRemoving) {
                return prev.filter(id => id !== eventId);
            } else {
                if (evt?.isGroupEvent && !eventGroupData[eventId]) {
                    setEventGroupData(g => ({
                        ...g,
                        [eventId]: { groupName: '', groupMembers: [] }
                    }));
                }
                return [...prev, eventId];
            }
        });
    };

    const handleGroupNameChange = (eventId: number, groupName: string) => {
        setEventGroupData(prev => ({
            ...prev,
            [eventId]: {
                groupName,
                groupMembers: prev[eventId]?.groupMembers || []
            }
        }));
    };

    const handleAddGroupMember = (eventId: number) => {
        const evt = events.find(e => e.id === eventId);
        const max = evt?.maxGroupSize || 20;
        const currentMembers = eventGroupData[eventId]?.groupMembers || [];
        if (currentMembers.length + 1 >= max) return; // 1 primary + additional

        setEventGroupData(prev => ({
            ...prev,
            [eventId]: {
                groupName: prev[eventId]?.groupName || '',
                groupMembers: [...currentMembers, { name: '', towerNumber: '', flatNumber: '', phone: '', role: '' }]
            }
        }));
    };

    const handleRemoveGroupMember = (eventId: number, memberIndex: number) => {
        setEventGroupData(prev => {
            const currentMembers = prev[eventId]?.groupMembers || [];
            return {
                ...prev,
                [eventId]: {
                    groupName: prev[eventId]?.groupName || '',
                    groupMembers: currentMembers.filter((_, idx) => idx !== memberIndex)
                }
            };
        });
    };

    const handleGroupMemberFieldChange = (eventId: number, memberIndex: number, field: 'name' | 'towerNumber' | 'flatNumber' | 'phone' | 'role', value: string) => {
        setEventGroupData(prev => {
            const currentMembers = [...(prev[eventId]?.groupMembers || [])];
            if (currentMembers[memberIndex]) {
                currentMembers[memberIndex] = { ...currentMembers[memberIndex], [field]: value };
            }
            return {
                ...prev,
                [eventId]: {
                    groupName: prev[eventId]?.groupName || '',
                    groupMembers: currentMembers
                }
            };
        });
    };

    const handleSelectAll = () => {
        const eligibleIds = events
            .filter(e => !isEventRegistrationClosed(e.registrationDeadline, e.eventDate) || initialEventIds.includes(e.id))
            .map(e => e.id);
        setSelectedEventIds(eligibleIds);
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

        // Validate group event details
        for (const evtId of selectedEventIds) {
            const evt = events.find(e => e.id === evtId);
            if (evt?.isGroupEvent) {
                const groupInfo = eventGroupData[evtId] || { groupName: '', groupMembers: [] };
                if (!groupInfo.groupName || !groupInfo.groupName.trim()) {
                    setSubmitError(`Please provide a Group / Team Name for "${evt.name}".`);
                    return;
                }

                // Check each member's mandatory fields
                for (let i = 0; i < groupInfo.groupMembers.length; i++) {
                    const gm = groupInfo.groupMembers[i];
                    const memberNum = i + 2;
                    if (!gm.name || !gm.name.trim()) {
                        setSubmitError(`Please provide the Full Name for Member #${memberNum} in "${evt.name}".`);
                        return;
                    }
                    if (!gm.towerNumber || !gm.towerNumber.trim()) {
                        setSubmitError(`Tower Number is mandatory for Member #${memberNum} (${gm.name || 'Unnamed'}) in "${evt.name}".`);
                        return;
                    }
                    if (!gm.flatNumber || !gm.flatNumber.trim()) {
                        setSubmitError(`Flat Number is mandatory for Member #${memberNum} (${gm.name || 'Unnamed'}) in "${evt.name}".`);
                        return;
                    }
                }

                const validMembers = groupInfo.groupMembers.filter(m => m.name.trim() !== '');
                const totalTeamSize = 1 + validMembers.length; // lead participant + members
                const min = evt.minGroupSize || 1;
                const max = evt.maxGroupSize || 20;

                if (totalTeamSize < min) {
                    setSubmitError(`"${evt.name}" requires at least ${min} participants. Currently you have ${totalTeamSize}.`);
                    return;
                }
                if (totalTeamSize > max) {
                    setSubmitError(`"${evt.name}" allows a maximum of ${max} participants. Currently you have ${totalTeamSize}.`);
                    return;
                }
            }
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
                    selectedEventIds: selectedEventIds,
                    eventGroupData: eventGroupData
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
                                    const isClosed = isEventRegistrationClosed(evt.registrationDeadline, evt.eventDate);
                                    const isSelected = selectedEventIds.includes(evt.id);
                                    const isInitiallyRegistered = initialEventIds.includes(evt.id);
                                    const contacts = (evt.contactPersons || []).filter(c => c && (c.name?.trim() || c.contactNumber?.trim()));
                                    const hasContacts = contacts.length > 0;
                                    const isPopoverOpen = activeContactPopoverId === evt.id;

                                    return (
                                        <div
                                            key={evt.id}
                                            onClick={() => handleToggleEvent(evt.id)}
                                            className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 select-none relative ${
                                                isClosed && !isInitiallyRegistered
                                                    ? 'bg-slate-100/80 border-slate-200 opacity-75 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-blue-50/70 border-blue-300 shadow-sm cursor-pointer'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200 cursor-pointer'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={isClosed && !isInitiallyRegistered}
                                                onChange={() => {}} // Handled by container click
                                                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                                            {evt.name}
                                                        </span>
                                                        <Link
                                                            to={`/events/${evt.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md transition-colors border border-orange-200/60 shrink-0"
                                                            title={`Open rules and details for ${evt.name} in a new tab`}
                                                        >
                                                            <BookOpen className="w-3 h-3 text-orange-500 shrink-0" />
                                                            <span>View Rules and Details</span>
                                                            <ExternalLink className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                                                        </Link>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isClosed && (
                                                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                                                                Closed
                                                            </span>
                                                        )}
                                                        {isInitiallyRegistered && (
                                                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                Currently Registered
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mt-1.5">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        {evt.isGroupEvent && (
                                                            <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                                                <Users className="w-3 h-3 text-indigo-600" />
                                                                Group Event ({evt.minGroupSize || 1} - {evt.maxGroupSize || 20} members)
                                                            </span>
                                                        )}
                                                        {evt.eventDate && (
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <Calendar className="w-3 h-3 text-blue-600" />
                                                                {new Date(evt.eventDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {evt.registrationDeadline && (
                                                            <span className={`flex items-center gap-1 font-medium ${isClosed ? 'text-rose-600' : 'text-amber-700'}`}>
                                                                <Clock className="w-3 h-3" />
                                                                Deadline: {new Date(evt.registrationDeadline).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {evt.venue && (
                                                            <span className="flex items-center gap-1">
                                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                                {evt.venue}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Contact Persons Interactive Badge */}
                                                    {hasContacts && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveContactPopoverId(prev => prev === evt.id ? null : evt.id);
                                                            }}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                                                                isPopoverOpen
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                                            }`}
                                                            title="Toggle event contact persons"
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                            <span>{contacts.length} Contact{contacts.length > 1 ? 's' : ''}</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Group Event Additional Details Section when Selected */}
                                                {isSelected && evt.isGroupEvent && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-3 pt-3 border-t border-indigo-200/80 bg-indigo-50/50 rounded-xl p-3 space-y-3 cursor-default"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                                                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                                                Group / Team Details
                                                            </span>
                                                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                                                                Team Size: {1 + ((eventGroupData[evt.id]?.groupMembers || []).filter(m => m.name.trim()).length)} (Req: {evt.minGroupSize || 1}-{evt.maxGroupSize || 20})
                                                            </span>
                                                        </div>

                                                        {/* Group Name input */}
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                                Group / Team Name <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={eventGroupData[evt.id]?.groupName || ''}
                                                                onChange={(e) => handleGroupNameChange(evt.id, e.target.value)}
                                                                placeholder="e.g., Rhythm Dancers, Tower C Rockers"
                                                                className="w-full text-xs px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                                            />
                                                        </div>

                                                        {/* Primary member indicator */}
                                                        <div className="p-2 bg-white/90 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                                <span className="font-bold text-slate-800">{member.name}</span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Team Lead / Primary</span>
                                                            </div>
                                                            <span className="text-[11px] text-slate-400">{member.phone || member.email || ''}</span>
                                                        </div>

                                                        {/* Additional Members List */}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-bold text-slate-700">
                                                                    Additional Team Members
                                                                </span>
                                                                {(1 + (eventGroupData[evt.id]?.groupMembers?.length || 0)) < (evt.maxGroupSize || 20) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddGroupMember(evt.id)}
                                                                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 hover:border-indigo-300 px-2 py-0.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                                                    >
                                                                        + Add Member
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {(eventGroupData[evt.id]?.groupMembers || []).map((gm, mIdx) => (
                                                                <div key={mIdx} className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-2">
                                                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                                                        <span>Member #{mIdx + 2}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveGroupMember(evt.id, mIdx)}
                                                                            className="text-rose-500 hover:text-rose-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                                                                            title="Remove member"
                                                                        >
                                                                            <X className="w-3 h-3" /> Remove
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                                        <div className="sm:col-span-5">
                                                                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                                                Full Name <span className="text-rose-500">*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={gm.name}
                                                                                onChange={(e) => handleGroupMemberFieldChange(evt.id, mIdx, 'name', e.target.value)}
                                                                                placeholder="Full Name"
                                                                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="sm:col-span-2">
                                                                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                                                Tower <span className="text-rose-500">*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={gm.towerNumber}
                                                                                onChange={(e) => handleGroupMemberFieldChange(evt.id, mIdx, 'towerNumber', e.target.value)}
                                                                                placeholder="e.g. A"
                                                                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="sm:col-span-2">
                                                                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                                                Flat <span className="text-rose-500">*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={gm.flatNumber}
                                                                                onChange={(e) => handleGroupMemberFieldChange(evt.id, mIdx, 'flatNumber', e.target.value)}
                                                                                placeholder="e.g. 502"
                                                                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="sm:col-span-3">
                                                                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                                                Phone (Optional)
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={gm.phone || ''}
                                                                                onChange={(e) => handleGroupMemberFieldChange(evt.id, mIdx, 'phone', e.target.value)}
                                                                                placeholder="Phone"
                                                                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {((eventGroupData[evt.id]?.groupMembers || []).length === 0) && (
                                                                <p className="text-[11px] text-indigo-700/80 italic">
                                                                    No additional team members added yet. Click "+ Add Member" if other participants will join this team.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Inline Expandable Contacts Section */}
                                                {hasContacts && isPopoverOpen && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-2.5 pt-2 border-t border-indigo-100 bg-indigo-50/60 rounded-lg p-2.5 space-y-1.5 text-xs animate-in fade-in duration-150"
                                                    >
                                                        <div className="flex items-center justify-between pb-1">
                                                            <span className="font-bold text-indigo-900 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                                                <Info className="w-3 h-3 text-indigo-600" /> Event Coordinators
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveContactPopoverId(null);
                                                                }}
                                                                className="p-0.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100/80 rounded cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                            {contacts.map((c, cIdx) => (
                                                                <div key={cIdx} className="p-2 bg-white rounded-md border border-indigo-100 shadow-2xs space-y-0.5">
                                                                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                                                                        <User className="w-3 h-3 text-indigo-400 shrink-0" />
                                                                        <span className="truncate">{c.name || 'Coordinator'}</span>
                                                                    </div>
                                                                    {c.contactNumber && (
                                                                        <div className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">
                                                                            <Phone className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                                                            <a href={`tel:${c.contactNumber}`} className="hover:underline">
                                                                                {c.contactNumber}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                    {c.email && (
                                                                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                                                            <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                                            <a href={`mailto:${c.email}`} className="hover:underline truncate">
                                                                                {c.email}
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
