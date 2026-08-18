import React, { useState, useEffect } from 'react';
import { CameraIcon } from './icons/CameraIcon';
import { API_URL } from '../config';
import { CloseIcon } from './icons/CloseIcon';
import type { RegistrationFormField, EventContactPerson } from '../types/index';
import { isEventRegistrationClosed } from '../types/events';
import CameraCapture from './CameraCapture';
import { useAuth } from '../contexts/AuthContext';
import { compressImageFile } from '../utils/imageUtils';

export interface PublicEvent {
    id: number;
    festivalId?: number;
    festivalName?: string;
    name: string;
    description: string;
    rules?: string | null;
    image?: string;
    eventDate: string;
    startTime: string;
    endTime: string | null;
    venue: string;
    registrationDeadline?: string | null;
    registrationFormSchema: RegistrationFormField[];
    contactPersons?: EventContactPerson[];
    isGroupEvent?: boolean;
    minGroupSize?: number;
    maxGroupSize?: number;
    allowDuplicateMembers?: boolean;
}

interface RegistrationModalProps {
    event: PublicEvent;
    onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ event, onClose }) => {
    const { user, token } = useAuth();
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [groupMembers, setGroupMembers] = useState<Array<{ name: string; towerNumber: string; flatNumber: string; phone: string; role?: string }>>([
        { name: '', towerNumber: '', flatNumber: '', phone: '', role: '' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const isGroup = Boolean(event.isGroupEvent);
    const minSize = event.minGroupSize || 1;
    const maxSize = event.maxGroupSize || 20;

    useEffect(() => {
        if (!user) return;
        const initialData: Record<string, any> = {};
        (event.registrationFormSchema || []).forEach(field => {
            const fieldName = (field.name || '').toLowerCase();
            const fieldLabel = (field.label || '').toLowerCase();

            if (user.fullName && (fieldName.includes('name') || fieldLabel.includes('name'))) {
                initialData[field.name] = user.fullName;
            } else if (user.mobileNumber && (fieldName.includes('phone') || fieldName.includes('mobile') || fieldName.includes('contact') || fieldLabel.includes('phone') || fieldLabel.includes('mobile') || fieldLabel.includes('contact'))) {
                initialData[field.name] = user.mobileNumber;
            } else if (user.towerNumber && (fieldName.includes('tower') || fieldLabel.includes('tower'))) {
                initialData[field.name] = user.towerNumber;
            } else if (user.flatNumber && (fieldName.includes('flat') || fieldLabel.includes('flat'))) {
                initialData[field.name] = user.flatNumber;
            }
        });
        setFormData(prev => ({ ...initialData, ...prev }));
    }, [user, event.registrationFormSchema]);

    const handleInputChange = (name: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGroupMemberChange = (index: number, field: 'name' | 'towerNumber' | 'flatNumber' | 'phone' | 'role', value: string) => {
        const updated = [...groupMembers];
        updated[index] = { ...updated[index], [field]: value };
        setGroupMembers(updated);
    };

    const addGroupMember = () => {
        if (groupMembers.length + 1 >= maxSize) return;
        setGroupMembers([...groupMembers, { name: '', towerNumber: '', flatNumber: '', phone: '', role: '' }]);
    };

    const removeGroupMember = (index: number) => {
        if (groupMembers.length > 1) {
            setGroupMembers(groupMembers.filter((_, i) => i !== index));
        }
    };

    const isClosed = isEventRegistrationClosed(event.registrationDeadline, event.eventDate);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isClosed) {
            setError('Registration for this event is now closed.');
            return;
        }
        setIsLoading(true);
        setError('');

        // If it is a group event, validate roster
        if (isGroup) {
            const gName = (formData['group_name'] || '').trim();
            if (!gName) {
                setError('Please provide a Group / Team Name.');
                setIsLoading(false);
                return;
            }

            for (let i = 0; i < groupMembers.length; i++) {
                const gm = groupMembers[i];
                const memberNum = i + 2;
                if (!gm.name || !gm.name.trim()) {
                    setError(`Please provide the Full Name for Member #${memberNum}.`);
                    setIsLoading(false);
                    return;
                }
                if (!gm.towerNumber || !gm.towerNumber.trim()) {
                    setError(`Tower Number is mandatory for Member #${memberNum} (${gm.name || 'Unnamed'}).`);
                    setIsLoading(false);
                    return;
                }
                if (!gm.flatNumber || !gm.flatNumber.trim()) {
                    setError(`Flat Number is mandatory for Member #${memberNum} (${gm.name || 'Unnamed'}).`);
                    setIsLoading(false);
                    return;
                }
            }

            const validMembers = groupMembers.filter(m => m.name.trim() !== '');
            const leadName = (formData['name'] || user?.fullName || '').trim();
            const totalCount = validMembers.length + (leadName ? 1 : 0);

            if (totalCount < minSize) {
                setError(`This group event requires at least ${minSize} participants. Please add more members to your team roster.`);
                setIsLoading(false);
                return;
            }
            if (totalCount > maxSize) {
                setError(`This group event allows a maximum of ${maxSize} participants. Please adjust your roster.`);
                setIsLoading(false);
                return;
            }

            // Check for duplicate names/phones within the group
            const names = [leadName, ...validMembers.map(m => m.name.trim().toLowerCase())].filter(Boolean);
            const nameSet = new Set(names);
            if (nameSet.size !== names.length) {
                setError('Duplicate member detected: Each member in your group must be distinct.');
                setIsLoading(false);
                return;
            }
        }

        const towerNumber = formData['tower_number'] || formData['towerNumber'] || user?.towerNumber;
        const flatNumber = formData['flat_number'] || formData['flatNumber'] || user?.flatNumber;
        const email = formData['email'] || user?.email;
        const mobileNumber = formData['phone_number'] || formData['mobile_number'] || formData['contact_number'] || user?.mobileNumber;

        let hasApprovedContribution = false;
        try {
            const queryParams = new URLSearchParams();
            if (towerNumber) queryParams.append('towerNumber', towerNumber);
            if (flatNumber) queryParams.append('flatNumber', flatNumber);
            if (email) queryParams.append('email', email);
            if (mobileNumber) queryParams.append('mobileNumber', mobileNumber);

            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const checkRes = await fetch(`${API_URL}/public/check-contribution?${queryParams.toString()}`, { headers });
            if (checkRes.ok) {
                const data = await checkRes.json();
                hasApprovedContribution = !!data.hasApprovedContribution;
            }
        } catch (error) {
            console.error("Failed to check contribution status", error);
        }

        if (!hasApprovedContribution) {
            setError("Registration is restricted to residents with at least one approved contribution. No approved contribution was found for your residence or account details.");
            setIsLoading(false);
            return;
        }

        // Validate each additional group member's household contribution
        if (isGroup && groupMembers.length > 0) {
            for (let i = 0; i < groupMembers.length; i++) {
                const gm = groupMembers[i];
                const memberNum = i + 2;
                const tNum = (gm.towerNumber || '').trim();
                const fNum = (gm.flatNumber || '').trim();
                const mName = (gm.name || `Member #${memberNum}`).trim();

                if (tNum && fNum) {
                    try {
                        const checkUrl = `${API_URL}/public/check-contribution?towerNumber=${encodeURIComponent(tNum)}&flatNumber=${encodeURIComponent(fNum)}`;
                        const checkResp = await fetch(checkUrl);
                        if (checkResp.ok) {
                            const checkData = await checkResp.json();
                            if (!checkData.hasApprovedContribution && !checkData.contributionExists) {
                                setError(`Registration rejected for member "${mName}" (Flat ${tNum}-${fNum}): No approved contribution found for household Tower ${tNum}, Flat ${fNum}. Only members with an approved contribution from their household can be registered.`);
                                setIsLoading(false);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error('Member contribution check error:', e);
                    }
                }
            }
        }

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const submissionPayload = {
                ...formData,
                ...(isGroup ? { group_members: groupMembers.filter(m => m.name.trim() !== '') } : {})
            };

            const response = await fetch(`${API_URL}/public/events/${event.id}/register`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ formData: submissionPayload }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed. Please try again.');
            }
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderField = (field: RegistrationFormField) => {
        switch (field.type) {
            case 'textarea':
                return <textarea id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style" rows={3}></textarea>;
            case 'select':
                return (
                    <select id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style bg-white">
                        <option value="" disabled>Select an option</option>
                        {field.options?.split(',').map(opt => <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>)}
                    </select>
                );
            case 'checkbox':
                return (
                    <label className="flex items-center space-x-2 mt-2">
                        <input type="checkbox" id={field.name} checked={!!formData[field.name]} onChange={e => handleInputChange(field.name, e.target.checked)} required={field.required} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
                        <span className="text-sm text-slate-600">{field.label} {field.required && '*'}</span>
                    </label>
                );
            default:
                return <input type={field.type} id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Register for {event.name}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </div>

                {isSuccess ? (
                    <div className="p-8 text-center">
                        <h3 className="text-2xl font-bold text-green-600">Registration Confirmed!</h3>
                        <p className="mt-2 text-slate-600">Thank you for registering. We look forward to seeing you at the event.</p>
                        <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {isGroup && (
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                                        👥 Group Event Registration
                                    </h4>
                                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                                        Size: {minSize} - {maxSize} members
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-800">
                                    Please enter your team/group name and provide the details of all group members. Duplicate participants across groups are automatically checked.
                                </p>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Group / Team Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Rhythm Divas, Royal Dancers"
                                        value={formData['group_name'] || ''}
                                        onChange={e => handleInputChange('group_name', e.target.value)}
                                        className="w-full input-style text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-100 pt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                                {isGroup ? '1. Team Captain / Primary Contact' : 'Participant Details'}
                            </h4>
                            <div className="space-y-3">
                                {(event.registrationFormSchema || [])
                                    .filter(field => {
                                        const clean = (field.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                        if (isGroup && (clean === 'groupmembers' || clean === 'groupname' || clean === 'teamname' || clean === 'teammembers' || clean === 'members')) {
                                            return false;
                                        }
                                        return true;
                                    })
                                    .map(field => (
                                        <div key={field.name}>
                                            {field.type !== 'checkbox' && (
                                                <label htmlFor={field.name} className="block text-xs font-medium text-slate-700">{field.label} {field.required && '*'}</label>
                                            )}
                                            {renderField(field)}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Group Member Roster */}
                        {isGroup && (
                            <div className="border-t border-slate-200 pt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        2. Additional Group Members ({groupMembers.length + 1}/{maxSize})
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={addGroupMember}
                                        disabled={groupMembers.length + 1 >= maxSize}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 cursor-pointer"
                                    >
                                        + Add Member
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {groupMembers.map((member, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-600">Member #{idx + 2}</span>
                                                {groupMembers.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGroupMember(idx)}
                                                        className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                <div className="sm:col-span-5">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                        Full Name <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name"
                                                        required
                                                        value={member.name}
                                                        onChange={e => handleGroupMemberChange(idx, 'name', e.target.value)}
                                                        className="w-full input-style text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                        Tower <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. A"
                                                        required
                                                        value={member.towerNumber}
                                                        onChange={e => handleGroupMemberChange(idx, 'towerNumber', e.target.value)}
                                                        className="w-full input-style text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                        Flat <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 502"
                                                        required
                                                        value={member.flatNumber}
                                                        onChange={e => handleGroupMemberChange(idx, 'flatNumber', e.target.value)}
                                                        className="w-full input-style text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                        Phone (Optional)
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        placeholder="Phone"
                                                        value={member.phone}
                                                        onChange={e => handleGroupMemberChange(idx, 'phone', e.target.value)}
                                                        className="w-full input-style text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                                <p className="text-xs font-semibold text-rose-700">{error}</p>
                            </div>
                        )}
                        <div className="pt-2">
                            <button type="submit" disabled={isLoading} className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-400 cursor-pointer">
                                {isLoading ? 'Submitting...' : 'Submit Registration'}
                            </button>
                        </div>
                    </form>
                )}
                 <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
            </div>
        </div>
    );
};
