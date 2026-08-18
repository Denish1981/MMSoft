import React, { useState, useRef } from 'react';
import { X, Music, Upload, CheckCircle2, AlertCircle, Play, Pause, FileText, Trash2, Loader2, Info } from 'lucide-react';
import { API_URL } from '../../config';
import type { RegistrationFormField } from '../../types/index';

interface EventRegistrationItemWithSchema {
    id: number;
    eventId: number;
    eventName: string;
    eventDate: string;
    venue: string;
    submittedAt: string;
    name?: string;
    email?: string;
    paymentProofImage?: string;
    formData?: Record<string, any>;
    registrationFormSchema?: RegistrationFormField[];
    registrationDeadline?: string | null;
    isGroupEvent?: boolean;
    minGroupSize?: number;
    maxGroupSize?: number;
}

interface EventPerformanceDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    registration: EventRegistrationItemWithSchema | null;
    token: string | null;
    onSuccess: (updatedReg: any) => void;
}

export const EventPerformanceDetailsModal: React.FC<EventPerformanceDetailsModalProps> = ({
    isOpen,
    onClose,
    registration,
    token,
    onSuccess
}) => {
    if (!isOpen || !registration) return null;

    const initialFormData = registration.formData || {};

    const isGroupEvent = Boolean(
        registration.isGroupEvent || 
        initialFormData.group_name || 
        initialFormData.groupName || 
        initialFormData.group_members || 
        initialFormData.groupMembers
    );

    const schema = (registration.registrationFormSchema || []).filter(f => {
        const clean = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean === 'name' || clean === 'email' || clean === 'phonenumber' || clean === 'contactnumber' || clean === 'mobilenumber' || clean === 'townumber' || clean === 'towernumber' || clean === 'flatnumber' || clean === 'tower' || clean === 'flat') {
            return false;
        }
        // If it's a group event or group fields, hide them from dynamic schema fields since they are managed by the dedicated Group / Troupe section
        if (clean === 'groupmembers' || clean === 'groupname' || clean === 'teamname' || clean === 'teammembers' || clean === 'members') {
            return false;
        }
        return true;
    });

    const [answers, setAnswers] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        schema.forEach(field => {
            initial[field.name] = initialFormData[field.name] ?? '';
        });
        if (registration.isGroupEvent || initialFormData.group_name || initialFormData.group_members) {
            initial.group_name = initialFormData.group_name || initialFormData.groupName || '';
            const rawMembers = Array.isArray(initialFormData.group_members) 
                ? initialFormData.group_members 
                : (Array.isArray(initialFormData.groupMembers) ? initialFormData.groupMembers : []);
            
            initial.group_members = rawMembers.map((m: any) => {
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
        }
        return initial;
    });

    const isGroup = Boolean(registration.isGroupEvent || initialFormData.group_name || initialFormData.group_members);
    const groupMembers: Array<{ name: string; towerNumber?: string; flatNumber?: string; phone?: string; role?: string }> = Array.isArray(answers.group_members) ? answers.group_members : [];

    const handleAddMember = () => {
        const max = registration.maxGroupSize || 20;
        if (groupMembers.length + 1 >= max) return;
        setAnswers(prev => ({
            ...prev,
            group_members: [...(Array.isArray(prev.group_members) ? prev.group_members : []), { name: '', towerNumber: '', flatNumber: '', phone: '' }]
        }));
    };

    const handleRemoveMember = (idx: number) => {
        setAnswers(prev => ({
            ...prev,
            group_members: (Array.isArray(prev.group_members) ? prev.group_members : []).filter((_, i) => i !== idx)
        }));
    };

    const handleMemberFieldChange = (idx: number, field: 'name' | 'towerNumber' | 'flatNumber' | 'phone', val: string) => {
        setAnswers(prev => {
            const list = [...(Array.isArray(prev.group_members) ? prev.group_members : [])];
            if (list[idx]) {
                list[idx] = { ...list[idx], [field]: val };
            }
            return {
                ...prev,
                group_members: list
            };
        });
    };

    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [playingAudioField, setPlayingAudioField] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleTextChange = (fieldName: string, value: any) => {
        setAnswers(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleFileUpload = async (fieldName: string, file: File) => {
        // Limit max size to 15MB
        if (file.size > 15 * 1024 * 1024) {
            setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 15MB.`);
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result as string;
                setAnswers(prev => ({
                    ...prev,
                    [fieldName]: base64Data,
                    [`${fieldName}_filename`]: file.name,
                    [`${fieldName}_filesize`]: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                }));
                setErrorMessage('');
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setErrorMessage('Failed to read file. Please try a different audio track.');
        }
    };

    const handleRemoveFile = (fieldName: string) => {
        if (playingAudioField === fieldName && audioRef.current) {
            audioRef.current.pause();
            setPlayingAudioField(null);
        }
        setAnswers(prev => {
            const next = { ...prev };
            delete next[fieldName];
            delete next[`${fieldName}_filename`];
            delete next[`${fieldName}_filesize`];
            return next;
        });
    };

    const togglePlayAudio = (fieldName: string, dataUrl: string) => {
        if (playingAudioField === fieldName) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setPlayingAudioField(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(dataUrl);
            audioRef.current.play().catch(e => console.error('Audio playback error:', e));
            audioRef.current.onended = () => setPlayingAudioField(null);
            setPlayingAudioField(fieldName);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');

        // Validate group details if it's a group event
        if (isGroup) {
            const gName = (answers.group_name || '').trim();
            if (!gName) {
                setErrorMessage('Group / Team Name is required.');
                setIsSaving(false);
                return;
            }

            for (let i = 0; i < groupMembers.length; i++) {
                const gm = groupMembers[i];
                const memberNum = i + 2;
                if (!gm.name || !gm.name.trim()) {
                    setErrorMessage(`Please provide the Full Name for Member #${memberNum}.`);
                    setIsSaving(false);
                    return;
                }
                if (!gm.towerNumber || !gm.towerNumber.trim()) {
                    setErrorMessage(`Tower Number is mandatory for Member #${memberNum} (${gm.name || 'Unnamed'}).`);
                    setIsSaving(false);
                    return;
                }
                if (!gm.flatNumber || !gm.flatNumber.trim()) {
                    setErrorMessage(`Flat Number is mandatory for Member #${memberNum} (${gm.name || 'Unnamed'}).`);
                    setIsSaving(false);
                    return;
                }
            }
        }

        try {
            // Client-side pre-check for household contributions of additional members
            if (isGroup && groupMembers.length > 0) {
                for (let i = 0; i < groupMembers.length; i++) {
                    const gm = groupMembers[i];
                    const memberNum = i + 2;
                    const tNum = (gm.towerNumber || '').trim();
                    const fNum = (gm.flatNumber || '').trim();
                    const mName = (gm.name || `Member #${memberNum}`).trim();

                    if (tNum && fNum) {
                        const checkUrl = `${API_URL}/public/check-contribution?towerNumber=${encodeURIComponent(tNum)}&flatNumber=${encodeURIComponent(fNum)}`;
                        const checkResp = await fetch(checkUrl);
                        if (checkResp.ok) {
                            const checkData = await checkResp.json();
                            if (!checkData.hasApprovedContribution && !checkData.contributionExists) {
                                setErrorMessage(`Registration rejected for member "${mName}" (Flat ${tNum}-${fNum}): No approved contribution found for household Tower ${tNum}, Flat ${fNum}. Only members with an approved contribution from their household can be registered.`);
                                setIsSaving(false);
                                return;
                            }
                        }
                    }
                }
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/donor/registrations/${registration.id}/details`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    formData: answers
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save performance details.');
            }

            setSuccessMessage('Additional details saved successfully!');
            onSuccess(data.registration);
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const participantName = registration.name || initialFormData.name || initialFormData.participantName || 'Participant';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
                            <Music className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold leading-snug">
                                Additional Details Submission
                            </h3>
                            <p className="text-xs text-blue-200 mt-0.5">
                                {registration.eventName} • <strong className="text-white">{participantName}</strong>
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

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                    
                    <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            Provide your event specific details (e.g. song track, group members, category, documents) below. You can update these anytime before the event.
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Group Details Section if Group Event */}
                    {isGroup && (
                        <div className="space-y-3 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                    👥 Group / Troupe Details
                                </span>
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                    Team Size: {1 + groupMembers.filter(m => m.name.trim()).length} (Req: {registration.minGroupSize || 1}-{registration.maxGroupSize || 20})
                                </span>
                            </div>

                            {/* Group Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Group / Team Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={answers.group_name || ''}
                                    onChange={e => handleTextChange('group_name', e.target.value)}
                                    placeholder="e.g., Rhythm Dancers, Starlight Crew"
                                    className="w-full text-xs px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                            </div>

                            {/* Additional Roster */}
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-700">
                                        Additional Performers / Group Members
                                    </span>
                                    {(1 + groupMembers.length) < (registration.maxGroupSize || 20) && (
                                        <button
                                            type="button"
                                            onClick={handleAddMember}
                                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 hover:border-indigo-300 px-2 py-0.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                        >
                                            + Add Member
                                        </button>
                                    )}
                                </div>

                                {groupMembers.map((gm, mIdx) => (
                                    <div key={mIdx} className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                            <span>Member #{mIdx + 2}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMember(mIdx)}
                                                className="text-rose-500 hover:text-rose-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                                                title="Remove member"
                                            >
                                                <Trash2 className="w-3 h-3" /> Remove
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
                                                    onChange={e => handleMemberFieldChange(mIdx, 'name', e.target.value)}
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
                                                    value={gm.towerNumber || ''}
                                                    onChange={e => handleMemberFieldChange(mIdx, 'towerNumber', e.target.value)}
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
                                                    value={gm.flatNumber || ''}
                                                    onChange={e => handleMemberFieldChange(mIdx, 'flatNumber', e.target.value)}
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
                                                    onChange={e => handleMemberFieldChange(mIdx, 'phone', e.target.value)}
                                                    placeholder="Phone"
                                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {groupMembers.length === 0 && (
                                    <p className="text-[11px] text-indigo-700/80 italic">
                                        No additional performers added yet. Use "+ Add Member" to include fellow performers.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {schema.length === 0 && !isGroup ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            No special requirements or custom fields needed for this event.
                        </div>
                    ) : (
                        schema.map((field) => {
                            const val = answers[field.name] ?? '';
                            const isAudioOrFile = field.type === 'audio' || field.type === 'file';

                            return (
                                <div key={field.name} className="space-y-1.5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                                    <label className="block text-xs font-bold text-slate-800">
                                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                                    </label>

                                    {/* Text Input */}
                                    {field.type === 'text' && (
                                        <input
                                            type="text"
                                            value={val}
                                            required={field.required}
                                            onChange={e => handleTextChange(field.name, e.target.value)}
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    )}

                                    {/* Text Area (e.g. Group member names) */}
                                    {field.type === 'textarea' && (
                                        <textarea
                                            value={val}
                                            required={field.required}
                                            rows={3}
                                            onChange={e => handleTextChange(field.name, e.target.value)}
                                            placeholder={`List names, ages, or instructions here...`}
                                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    )}

                                    {/* Number */}
                                    {field.type === 'number' && (
                                        <input
                                            type="number"
                                            value={val}
                                            required={field.required}
                                            onChange={e => handleTextChange(field.name, e.target.value)}
                                            placeholder="0"
                                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    )}

                                    {/* Select / Dropdown */}
                                    {field.type === 'select' && (
                                        <select
                                            value={val}
                                            required={field.required}
                                            onChange={e => handleTextChange(field.name, e.target.value)}
                                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        >
                                            <option value="">-- Select an option --</option>
                                            {(field.options || '').split(',').map((opt, i) => (
                                                <option key={i} value={opt.trim()}>{opt.trim()}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Checkbox */}
                                    {field.type === 'checkbox' && (
                                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                                            <input
                                                type="checkbox"
                                                checked={!!val}
                                                onChange={e => handleTextChange(field.name, e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                            />
                                            <span className="text-xs text-slate-700 font-medium">Yes / Agreed</span>
                                        </label>
                                    )}

                                    {/* Audio & File Upload */}
                                    {isAudioOrFile && (
                                        <div className="pt-1">
                                            {val ? (
                                                <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-xl shadow-xs">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                                            {field.type === 'audio' ? <Music className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-xs font-bold text-slate-800 truncate">
                                                                {answers[`${field.name}_filename`] || `${field.label} Uploaded`}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {answers[`${field.name}_filesize`] || 'Attached'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {field.type === 'audio' && typeof val === 'string' && val.startsWith('data:audio') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePlayAudio(field.name, val)}
                                                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                                            >
                                                                {playingAudioField === field.name ? (
                                                                    <>
                                                                        <Pause className="w-3.5 h-3.5" /> Pause
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Play className="w-3.5 h-3.5" /> Preview
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile(field.name)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Remove file"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-white cursor-pointer transition-all hover:bg-blue-50/40 group">
                                                        <div className="p-2.5 rounded-full bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform mb-1.5">
                                                            <Upload className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">
                                                            Click to upload {field.type === 'audio' ? 'Audio Track (.mp3, .wav, .m4a)' : 'File'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 mt-0.5">
                                                            {field.options || (field.type === 'audio' ? 'MP3, WAV, M4A up to 15MB' : 'Max 15MB')}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept={field.type === 'audio' ? 'audio/*,.mp3,.wav,.m4a,.aac' : undefined}
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                if (f) handleFileUpload(field.name, f);
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {/* Submit Bar */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Details...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" /> Save Additional Details
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
