import React, { useState } from 'react';
import { 
    Calendar, Clock, MapPin, AlertCircle, CheckCircle2, 
    Share2, Phone, Mail, ExternalLink, Sparkles, BookOpen, 
    ShieldAlert, Check, Copy, X
} from 'lucide-react';
import { formatUTCDate } from '../utils/formatting';
import { isEventRegistrationClosed } from '../types/events';
import type { PublicEvent } from './RegistrationModal';

interface EventRulesDetailsModalProps {
    event: PublicEvent | null;
    isOpen: boolean;
    onClose: () => void;
    onRegisterClick?: (event: PublicEvent) => void;
    hasApprovedContribution?: boolean;
}

export const EventRulesDetailsModal: React.FC<EventRulesDetailsModalProps> = ({
    event,
    isOpen,
    onClose,
    onRegisterClick,
    hasApprovedContribution = true
}) => {
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen || !event) return null;

    const isClosed = isEventRegistrationClosed(event.registrationDeadline, event.eventDate);

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Parse rules string into clean individual rule items
    const parseRules = (rulesText?: string | null): string[] => {
        if (!rulesText || !rulesText.trim()) return [];
        return rulesText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[\s•\-\*]+/, '').replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(line => line.length > 0);
    };

    const rulesList = parseRules(event.rules);

    // Share link generation
    const shareUrl = `${window.location.origin}${window.location.pathname}#/events/${event.id}`;

    const handleCopyShareLink = async () => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2500);
            }
        } catch {
            // fallback
        }
    };

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(`🎉 Join "${event.name}" at Gold Towers Mitra Mandal!\n🗓️ Date: ${formatUTCDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}\n📍 Venue: ${event.venue}\n\nCheck full details & rules here:\n${shareUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div 
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Banner */}
                <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 text-white shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {event.festivalName && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md">
                                {event.festivalName}
                            </span>
                        )}
                        {isClosed ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/90 text-white shadow-sm flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Registration Closed
                            </span>
                        ) : event.registrationDeadline ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-900/40 text-amber-100 border border-amber-300/30">
                                Registration Closes: {formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'short' })}
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/90 text-white shadow-sm flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Registration Open
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                        {event.name}
                    </h2>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-grow divide-y divide-slate-100">
                    {/* Event Highlights & Timing Info Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-sm">
                        <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Event Date</span>
                                <span className="font-semibold text-slate-800">
                                    {formatUTCDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {event.startTime && (
                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Timings</span>
                                    <span className="font-semibold text-slate-800">
                                        {formatTime(event.startTime)}
                                        {event.endTime ? ` – ${formatTime(event.endTime)}` : ''}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Venue</span>
                                <span className="font-semibold text-slate-800">{event.venue}</span>
                            </div>
                        </div>

                        {event.registrationDeadline && (
                            <div className="flex items-start gap-2.5">
                                <div className={`p-2 rounded-xl shrink-0 ${isClosed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Last Date to Register</span>
                                    <span className={`font-semibold ${isClosed ? 'text-red-700' : 'text-slate-800'}`}>
                                        {formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Event Overview & Description */}
                    <div className="pt-6 space-y-2">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-orange-600" /> About the Event
                        </h3>
                        {event.description ? (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-orange-50/40 p-4 rounded-2xl border border-orange-100">
                                {event.description}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-400 italic">
                                No specific overview entered for this event.
                            </p>
                        )}
                    </div>

                    {/* Event Rules & Regulations */}
                    <div className="pt-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-600" /> Rules & Guidelines
                            </h3>
                            <span className="text-xs font-semibold text-slate-400">
                                {rulesList.length} criteria
                            </span>
                        </div>

                        {rulesList.length > 0 ? (
                            <div className="space-y-2.5">
                                {rulesList.map((rule, idx) => (
                                    <div 
                                        key={idx}
                                        className="flex items-start gap-3 p-3 bg-amber-50/50 hover:bg-amber-50 rounded-xl border border-amber-200/70 transition-colors text-sm text-slate-800"
                                    >
                                        <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <span className="leading-snug">{rule}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic text-center">
                                Standard community celebration guidelines apply. Please follow coordinator instructions on the event day.
                            </div>
                        )}
                    </div>

                    {/* Contact Persons / Coordinators */}
                    {event.contactPersons && event.contactPersons.length > 0 && (
                        <div className="pt-6 space-y-2.5">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Phone className="w-4 h-4 text-blue-600" /> Event Coordinators
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {event.contactPersons.map((contact, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                        <div className="font-bold text-slate-800 text-sm">{contact.name}</div>
                                        {contact.contactNumber && (
                                            <a 
                                                href={`tel:${contact.contactNumber}`} 
                                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                <Phone className="w-3 h-3" /> {contact.contactNumber}
                                            </a>
                                        )}
                                        {contact.email && (
                                            <a 
                                                href={`mailto:${contact.email}`} 
                                                className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 truncate"
                                            >
                                                <Mail className="w-3 h-3 shrink-0" /> {contact.email}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleCopyShareLink}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex-1 sm:flex-initial"
                            title="Copy link to event details"
                        >
                            {isCopied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Link!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Link
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleWhatsAppShare}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex-1 sm:flex-initial"
                            title="Share on WhatsApp"
                        >
                            <Share2 className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                            Close
                        </button>

                        {onRegisterClick && hasApprovedContribution && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isClosed) {
                                        onClose();
                                        onRegisterClick(event);
                                    }
                                }}
                                disabled={isClosed}
                                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                                    isClosed
                                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700'
                                }`}
                            >
                                {isClosed ? 'Registration Closed' : 'Register for Event'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
