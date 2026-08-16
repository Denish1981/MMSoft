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

    const schema = (registration.registrationFormSchema || []).filter(
        f => f.name !== 'name' && f.name !== 'email' && f.name !== 'phone_number' && f.name !== 'tower_number' && f.name !== 'flat_number'
    );

    const initialFormData = registration.formData || {};
    const [answers, setAnswers] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        schema.forEach(field => {
            initial[field.name] = initialFormData[field.name] ?? '';
        });
        return initial;
    });

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

        try {
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

                    {schema.length === 0 ? (
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
