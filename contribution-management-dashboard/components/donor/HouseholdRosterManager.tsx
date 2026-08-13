import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Save, CheckCircle2, AlertCircle, Info, Ticket } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RosterMemberItem } from '../../types/auth';
import { API_URL } from '../../config';
import { MemberEventRegistrationModal, EventOption, ExistingRegistration } from './MemberEventRegistrationModal';

interface HouseholdRosterManagerProps {
    className?: string;
    compact?: boolean;
    events?: EventOption[];
    existingRegistrations?: ExistingRegistration[];
    hasApprovedContribution?: boolean;
    onRegistrationSuccess?: () => void;
}

export const HouseholdRosterManager: React.FC<HouseholdRosterManagerProps> = ({ 
    className = '',
    compact = false,
    events: propEvents,
    existingRegistrations = [],
    hasApprovedContribution = true,
    onRegistrationSuccess
}) => {
    const { user, token, updateProfile } = useAuth();
    
    const [roster, setRoster] = useState<RosterMemberItem[]>([]);
    const [eventsList, setEventsList] = useState<EventOption[]>(propEvents || []);
    const [selectedMemberForModal, setSelectedMemberForModal] = useState<RosterMemberItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        // Fetch public events to guarantee complete event metadata including contactPersons
        fetch(`${API_URL}/public/events`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (data && data.length > 0) {
                    setEventsList(data);
                } else if (propEvents && propEvents.length > 0) {
                    setEventsList(propEvents);
                }
            })
            .catch(err => {
                console.error('Failed to load events in HouseholdRosterManager:', err);
                if (propEvents && propEvents.length > 0) {
                    setEventsList(propEvents);
                }
            });
    }, [propEvents]);

    useEffect(() => {
        if (user) {
            if (user.familyRoster && Array.isArray(user.familyRoster) && user.familyRoster.length > 0) {
                setRoster(user.familyRoster);
            } else {
                // Initialize with primary user if roster is empty
                setRoster([{
                    id: 'roster-primary',
                    name: user.fullName || '',
                    phone: user.mobileNumber || '',
                    email: user.email || ''
                }]);
            }
            setIsDirty(false);
        }
    }, [user]);

    const handleAddMember = () => {
        const newMember: RosterMemberItem = {
            id: 'roster-' + Math.random().toString(36).substring(2, 9),
            name: '',
            phone: '',
            email: ''
        };
        setRoster(prev => [...prev, newMember]);
        setIsDirty(true);
    };

    const handleRemoveMember = (index: number) => {
        if (roster.length <= 1) {
            setErrorMessage('Household roster must have at least one member.');
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }
        setRoster(prev => prev.filter((_, idx) => idx !== index));
        setIsDirty(true);
    };

    const handleFieldChange = (index: number, field: keyof RosterMemberItem, value: string) => {
        setRoster(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
        setIsDirty(true);
    };

    const handleSaveRoster = async () => {
        setIsSaving(true);
        setSaveMessage('');
        setErrorMessage('');

        const validRoster = roster.filter(m => m.name.trim() !== '');
        if (validRoster.length === 0) {
            setErrorMessage('Please provide a name for at least one household member.');
            setIsSaving(false);
            return;
        }

        const res = await updateProfile({ familyRoster: validRoster });
        setIsSaving(false);

        if (res.success) {
            setSaveMessage('Household Roster updated successfully!');
            setIsDirty(false);
            onRegistrationSuccess?.();
            setTimeout(() => setSaveMessage(''), 3500);
        } else {
            setErrorMessage(res.message || 'Failed to update household roster.');
        }
    };

    return (
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>
            <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            Family Details
                            {isDirty && (
                                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                    Unsaved Changes
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pre-configure members in your household to quickly select them when registering for society events.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleAddMember}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer"
                    >
                        <UserPlus className="w-3.5 h-3.5 text-blue-600" /> + Add Member
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveRoster}
                        disabled={isSaving || !isDirty}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm ${
                            isDirty 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                    >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Saving...' : 'Save Roster'}
                    </button>
                </div>
            </div>

            {saveMessage && (
                <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {saveMessage}
                </div>
            )}

            {errorMessage && (
                <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    {errorMessage}
                </div>
            )}

            <div className="p-5 space-y-3">
                {roster.map((member, idx) => (
                    <div 
                        key={member.id || idx}
                        className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-xl transition-all space-y-3"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                    Member #{idx + 1}
                                </span>
                                {idx === 0 && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200 ml-1">
                                        Primary Resident
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!member.name || !member.name.trim()) {
                                            setErrorMessage('Please enter a name for the member before registering for events.');
                                            setTimeout(() => setErrorMessage(''), 3000);
                                            return;
                                        }
                                        setSelectedMemberForModal(member);
                                    }}
                                    disabled={!hasApprovedContribution}
                                    title={
                                        !hasApprovedContribution
                                            ? 'Requires an approved contribution to register for events'
                                            : `Register ${member.name || 'member'} for events`
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                                        hasApprovedContribution
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-500/20'
                                            : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                                    }`}
                                >
                                    <Ticket className="w-3.5 h-3.5" />
                                    <span>Register for Event</span>
                                </button>

                                {idx > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(idx)}
                                        title="Remove member"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Remove</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Member Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={member.name}
                                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                                    placeholder="e.g. Rahul Sharma"
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={member.phone || ''}
                                    onChange={(e) => handleFieldChange(idx, 'phone', e.target.value)}
                                    placeholder="Mobile number"
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={member.email || ''}
                                    onChange={(e) => handleFieldChange(idx, 'email', e.target.value)}
                                    placeholder="Email address"
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 bg-blue-50/50 p-3 rounded-xl border border-blue-100/60">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                        <strong>Pro Tip:</strong> Members saved here will be automatically pre-populated in event registration dropdowns across the portal. Click <strong>"Register for Event"</strong> beside any member to instantly select events for them.
                    </span>
                </div>
            </div>

            <MemberEventRegistrationModal
                isOpen={!!selectedMemberForModal}
                onClose={() => setSelectedMemberForModal(null)}
                member={selectedMemberForModal}
                events={eventsList}
                existingRegistrations={existingRegistrations}
                token={token}
                hasApprovedContribution={hasApprovedContribution}
                onSuccess={() => {
                    onRegistrationSuccess?.();
                }}
            />
        </div>
    );
};
