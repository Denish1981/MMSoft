import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, MapPin, AlertCircle, CheckCircle2, 
    Share2, Phone, Mail, ArrowLeft, Sparkles, BookOpen, 
    ShieldAlert, Check, Copy, UserCheck, ChevronRight
} from 'lucide-react';
import { API_URL } from '../config';
import { formatUTCDate } from '../utils/formatting';
import { isEventRegistrationClosed } from '../types/events';
import { parseEventRules } from '../utils/ruleUtils';
import { EventRulesRenderer } from '../components/event-rules/EventRulesRenderer';
import { useAuth } from '../contexts/AuthContext';
import type { PublicEvent } from '../components/RegistrationModal';

export const EventDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, hasPermission, user, token } = useAuth();

    const [event, setEvent] = useState<PublicEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [hasApprovedContribution, setHasApprovedContribution] = useState<boolean>(false);

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    // Check if logged-in resident has an approved contribution
    useEffect(() => {
        let isMounted = true;
        const checkEligibility = async () => {
            if (!isAuthenticated) {
                if (isMounted) setHasApprovedContribution(false);
                return;
            }

            try {
                const queryParams = new URLSearchParams();
                if (user?.towerNumber) queryParams.append('towerNumber', user.towerNumber);
                if (user?.flatNumber) queryParams.append('flatNumber', user.flatNumber);
                if (user?.mobileNumber) queryParams.append('mobileNumber', user.mobileNumber);
                if (user?.email) queryParams.append('email', user.email);

                const checkHeaders: Record<string, string> = {};
                if (token) checkHeaders['Authorization'] = `Bearer ${token}`;

                const checkRes = await fetch(`${API_URL}/public/check-contribution?${queryParams.toString()}`, { headers: checkHeaders });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (isMounted) {
                        setHasApprovedContribution(!!checkData.hasApprovedContribution);
                    }
                }
            } catch {
                if (isMounted) setHasApprovedContribution(false);
            }
        };

        checkEligibility();
        return () => { isMounted = false; };
    }, [isAuthenticated, user, token]);

    useEffect(() => {
        let isMounted = true;
        const fetchEventDetails = async () => {
            if (!id) return;
            setIsLoading(true);
            setError('');
            try {
                const res = await fetch(`${API_URL}/public/events/${id}`);
                if (!res.ok) {
                    if (res.status === 404) throw new Error('Event not found or no longer active.');
                    throw new Error('Failed to load event details.');
                }
                const data = await res.json();
                if (isMounted) setEvent(data);
            } catch (err) {
                if (isMounted) setError(err instanceof Error ? err.message : 'Error fetching event');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchEventDetails();
        return () => { isMounted = false; };
    }, [id]);

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const shareUrl = window.location.href;

    const handleCopyShareLink = async () => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2500);
            }
        } catch {}
    };

    const handleWhatsAppShare = () => {
        if (!event) return;
        const text = encodeURIComponent(`🎉 Join "${event.name}" at Gold Towers Mitra Mandal!\n🗓️ Date: ${formatUTCDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}\n📍 Venue: ${event.venue}\n\nCheck full details & rules here:\n${shareUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-600 font-medium">Loading event details & rules...</p>
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-4">
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Event Not Found</h2>
                    <p className="text-sm text-slate-600">{error || 'This event could not be located.'}</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    const isClosed = isEventRegistrationClosed(event.registrationDeadline, event.eventDate);
    const parsedRules = parseEventRules(event.rules);
    const totalRuleCount = parsedRules.totalCount;

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            {/* Header */}
            <header className="bg-white shadow-xs border-b border-slate-200 sticky top-0 z-30">
                <nav className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-orange-600 font-semibold text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Home
                        </Link>
                        <span className="text-slate-300">|</span>
                        <Link to="/trust-details" className="text-base sm:text-lg font-bold text-slate-800 tracking-wide truncate max-w-xs sm:max-w-md">
                            Gold Towers Mitra Mandal
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to={dashboardTarget}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg shadow-xs hover:from-orange-600 hover:to-amber-700 transition-all font-medium text-xs sm:text-sm"
                        >
                            {isAuthenticated ? "Dashboard" : "Login"}
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow max-w-4xl space-y-8">
                {/* Hero Banner Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
                    {/* Header Image or Gradient Banner */}
                    <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 sm:p-10 text-white">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {event.festivalName && (
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg uppercase tracking-wider">
                                    {event.festivalName}
                                </span>
                            )}
                            {isClosed ? (
                                <span className="px-3 py-1 bg-red-600/90 backdrop-blur-md text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Registration Closed
                                </span>
                            ) : event.registrationDeadline ? (
                                <span className="px-3 py-1 bg-amber-900/40 border border-amber-300/40 text-amber-100 text-xs font-bold rounded-lg backdrop-blur-md">
                                    ⏳ Last Date: {formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'short' })}
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Registration Open
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                            {event.name}
                        </h1>

                        {/* Top action quick bar */}
                        <div className="mt-6 flex flex-wrap items-center gap-3 pt-6 border-t border-white/20">
                            <button
                                type="button"
                                onClick={handleCopyShareLink}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                            >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                                {isCopied ? 'Link Copied!' : 'Copy Share Link'}
                            </button>

                            <button
                                type="button"
                                onClick={handleWhatsAppShare}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Share on WhatsApp
                            </button>

                            {/* {!isClosed && isAuthenticated && hasApprovedContribution && (
                                <Link
                                    to="/register-events"
                                    className="inline-flex items-center gap-2 px-5 py-2 bg-white text-orange-600 hover:bg-orange-50 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all ml-auto"
                                >
                                    Register Now <ChevronRight className="w-4 h-4" />
                                </Link>
                            )} */}
                        </div>
                    </div>

                    {/* Quick Metadata Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200/80 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                                <span className="font-bold text-slate-900">
                                    {formatUTCDate(event.eventDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Timings</span>
                                <span className="font-bold text-slate-900">
                                    {event.startTime ? formatTime(event.startTime) : 'TBA'}
                                    {event.endTime ? ` – ${formatTime(event.endTime)}` : ''}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Venue</span>
                                <span className="font-bold text-slate-900 truncate block max-w-[150px]">{event.venue}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${isClosed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cutoff Date</span>
                                <span className={`font-bold ${isClosed ? 'text-red-700' : 'text-slate-900'}`}>
                                    {event.registrationDeadline 
                                        ? formatUTCDate(event.registrationDeadline, { day: 'numeric', month: 'short' })
                                        : 'Till Event Date'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Body Details */}
                    <div className="p-6 sm:p-10 space-y-10">
                        {/* Section 1: Overview */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <BookOpen className="w-5 h-5 text-orange-600" />
                                <h2 className="text-xl font-bold text-slate-900">Event Overview</h2>
                            </div>
                            {event.description ? (
                                <div className="text-slate-700 text-base leading-relaxed whitespace-pre-line bg-orange-50/30 p-6 rounded-2xl border border-orange-100/80">
                                    {event.description}
                                </div>
                            ) : (
                                <p className="text-slate-500 italic">No specific description provided for this event.</p>
                            )}
                        </div>

                        {/* Section 2: Rules & Regulations */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                                    <h2 className="text-xl font-bold text-slate-900">Rules & Regulations</h2>
                                </div>
                                {totalRuleCount > 0 && (
                                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                                        {totalRuleCount} {totalRuleCount === 1 ? 'criterion' : 'criteria'}
                                    </span>
                                )}
                            </div>

                            <EventRulesRenderer rulesText={event.rules} variant="page" />
                        </div>

                        {/* Section 3: Event Coordinators */}
                        {event.contactPersons && event.contactPersons.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Phone className="w-5 h-5 text-blue-600" />
                                    <h2 className="text-xl font-bold text-slate-900">Event Coordinators & Contact Persons</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {event.contactPersons.map((contact, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition-colors space-y-2">
                                            <div className="font-bold text-slate-900 text-base">{contact.name}</div>
                                            {contact.contactNumber && (
                                                <a 
                                                    href={`tel:${contact.contactNumber}`} 
                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                                >
                                                    <Phone className="w-4 h-4" /> {contact.contactNumber}
                                                </a>
                                            )}
                                            {contact.email && (
                                                <a 
                                                    href={`mailto:${contact.email}`} 
                                                    className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-xs truncate"
                                                >
                                                    <Mail className="w-3.5 h-3.5 shrink-0" /> {contact.email}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom CTA Box */}
                        {/* {isAuthenticated && hasApprovedContribution && (
                            <div className="p-6 sm:p-8 bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                                <div className="space-y-1 text-center sm:text-left">
                                    <h3 className="text-xl font-extrabold">Ready to Participate?</h3>
                                    <p className="text-orange-100 text-sm">
                                        {isClosed 
                                            ? "Registration has officially closed for this event." 
                                            : "Submit participant entries for your family easily online."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {!isClosed ? (
                                        <Link
                                            to="/register-events"
                                            className="px-6 py-3 bg-white text-orange-600 hover:bg-orange-50 font-extrabold rounded-2xl shadow-md transition-all text-sm"
                                        >
                                            Register Online
                                        </Link>
                                    ) : (
                                        <span className="px-5 py-2.5 bg-white/20 text-white font-bold rounded-2xl text-xs backdrop-blur-md">
                                            Registration Closed
                                        </span>
                                    )}
                                </div>
                            </div>
                        )} */}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-sm text-slate-500 border-t border-slate-200 bg-white">
                <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                    <div>
                        © {new Date().getFullYear()} GTMM Trust. All rights reserved.
                    </div>
                    <div className="flex items-center space-x-6">
                        <Link to="/" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                            All Events
                        </Link>
                        <Link to="/trust-details" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                            Trust Details
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default EventDetailsPage;
