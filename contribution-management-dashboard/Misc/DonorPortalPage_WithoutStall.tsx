import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useData } from '../contexts/DataContext';
import { API_URL } from '../config';
import { 
    Heart, Calendar, Store, Bell, CheckCircle2, XCircle, Clock, 
    RefreshCw, PlusCircle, Building2, Phone, User as UserIcon, X, Receipt, Layers,
    Ticket, Eye, FileText, Mail, Users, HelpCircle
} from 'lucide-react';
import StallRegistrationModal from '../components/StallRegistrationModal';
import { RegistrationModal, PublicEvent } from '../components/RegistrationModal';
import type { Festival as PublicFestival } from '../types/index';
import { formatReceiptNo, ReceiptData } from '../utils/receiptUtils';
import { ReceiptModal } from '../components/ReceiptModal';

interface ContributionItem {
    id: number;
    donorName: string;
    amount: number;
    numberOfCoupons: number;
    date: string;
    status: string;
    type?: string;
    campaignName?: string;
    image?: string;
}

interface StallRegistrationItem {
    id: number;
    festivalId: number;
    festivalName: string;
    registrantName: string;
    contactNumber: string;
    stallDates: string[];
    products: Array<{ productName: string; price?: number }>;
    needsElectricity: boolean;
    numberOfTables: number;
    totalPayment: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    rejectionReason?: string;
    submittedAt: string;
    reviewedAt?: string;
}

interface EventRegistrationItem {
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
}

interface UpcomingEvent {
    id: number;
    name: string;
    description?: string;
    eventDate: string;
    startTime?: string;
    venue: string;
    registrationFormSchema?: any[];
}

const DonorPortalPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const { openContributionModal, isContributionModalOpen } = useModal();
    const { contributions: globalContributions } = useData();
    const prevModalOpenRef = useRef(isContributionModalOpen);

    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stalls' | 'contributions' | 'events' | 'announcements'>('stalls');
    
    const [contributions, setContributions] = useState<ContributionItem[]>([]);
    const [stallRegistrations, setStallRegistrations] = useState<StallRegistrationItem[]>([]);
    const [eventRegistrations, setEventRegistrations] = useState<EventRegistrationItem[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
    const [selectedRegForDetails, setSelectedRegForDetails] = useState<EventRegistrationItem | null>(null);

    const getParticipantName = (e: EventRegistrationItem) => {
        return e.name || e.formData?.name || e.formData?.participantName || e.formData?.fullName || 'Participant';
    };

    const getParticipantPhone = (e: EventRegistrationItem) => {
        return e.formData?.phone_number || e.formData?.contact_number || e.formData?.phone || e.formData?.mobile_number || e.formData?.mobile || '';
    };

    const getParticipantEmail = (e: EventRegistrationItem) => {
        return e.email || e.formData?.email || '';
    };

    const getParticipantTowerFlat = (e: EventRegistrationItem) => {
        const tower = e.formData?.tower_number || e.formData?.towerNumber || e.formData?.tower || '';
        const flat = e.formData?.flat_number || e.formData?.flatNumber || e.formData?.flat || '';
        if (tower && flat) return `${tower} - ${flat}`;
        return tower || flat || '';
    };

    const getExtraFormData = (formData?: Record<string, any>) => {
        if (!formData) return [];
        const internalKeys = new Set([
            'name', 'fullname', 'participantname', 'phone_number', 'contact_number', 
            'mobile_number', 'phone', 'mobile', 'email', 'tower_number', 'flat_number', 
            'tower', 'flat', 'id', 'user_id'
        ]);
        return Object.entries(formData).filter(([key, val]) => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return !internalKeys.has(cleanKey) && val !== null && val !== undefined && val !== '';
        });
    };

    const openReceipt = (c: ContributionItem) => {
        const cat = c.type === 'Miscellaneous' || c.type?.startsWith('Miscellaneous:') ? 'misc' : 'contribution';
        const rData: ReceiptData = {
            receiptNo: formatReceiptNo(c.id, cat),
            category: cat,
            title: cat === 'misc' ? 'Miscellaneous Income' : 'Individual Contribution',
            date: c.date,
            payerName: c.donorName || user?.fullName || 'Valued Donor',
            payerEmail: user?.email,
            payerPhone: user?.mobileNumber,
            towerNumber: user?.towerNumber,
            flatNumber: user?.flatNumber,
            amount: Number(c.amount),
            paymentMode: c.type || 'Online',
            festivalOrCampaign: c.campaignName || 'General Campaign',
            status: c.status === 'Completed' || c.status === 'Approved' ? 'Approved' : c.status,
            details: [
                { label: 'Food Coupons', value: String(c.numberOfCoupons || 0) },
                { label: 'Contribution Type', value: c.type || 'Standard' }
            ]
        };
        setSelectedReceipt(rData);
    };

    // Modals for Stall and Event Registration directly from Donor Portal
    const [selectedFestivalForStall, setSelectedFestivalForStall] = useState<PublicFestival | null>(null);
    const [selectedEventForRegister, setSelectedEventForRegister] = useState<PublicEvent | null>(null);
    
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const [choiceTab, setChoiceTab] = useState<'stall' | 'event'>('stall');
    const [publicFestivals, setPublicFestivals] = useState<PublicFestival[]>([]);
    const [publicEventsList, setPublicEventsList] = useState<PublicEvent[]>([]);
    const [isFetchingChoiceData, setIsFetchingChoiceData] = useState(false);

    const fetchPortalData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/donor/my-portal`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setContributions(data.contributions || []);
                setStallRegistrations(data.stallRegistrations || []);
                setEventRegistrations(data.eventRegistrations || []);
                setUpcomingEvents(data.upcomingEvents || []);
            }
        } catch (err) {
            console.error('Failed to load donor portal:', err);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const openChoiceModal = useCallback(async (tab: 'stall' | 'event' = 'stall') => {
        setChoiceTab(tab);
        setChoiceTab('event');
        setIsChoiceModalOpen(true);
        setIsFetchingChoiceData(true);
        try {
            const [festRes, evtRes] = await Promise.all([
                fetch(`${API_URL}/public/festivals`),
                fetch(`${API_URL}/public/events`)
            ]);
            if (festRes.ok) {
                const festData = await festRes.json();
                setPublicFestivals(festData || []);
            }
            if (evtRes.ok) {
                const evtData = await evtRes.json();
                setPublicEventsList(evtData || []);
            }
        } catch (err) {
            console.error('Failed to load festivals or events for choice modal:', err);
        } finally {
            setIsFetchingChoiceData(false);
        }
    }, []);

    useEffect(() => {
        if (prevModalOpenRef.current && !isContributionModalOpen) {
            setActiveTab('contributions');
            fetchPortalData();
        }
        prevModalOpenRef.current = isContributionModalOpen;
    }, [isContributionModalOpen, fetchPortalData]);

    useEffect(() => {
        fetchPortalData();
    }, [fetchPortalData, globalContributions]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const pendingStalls = stallRegistrations.filter(s => s.status === 'Pending');
    const approvedStalls = stallRegistrations.filter(s => s.status === 'Approved');
    const rejectedStalls = stallRegistrations.filter(s => s.status === 'Rejected');

    const totalDonated = contributions
        .filter(c => c.status === 'Completed' || c.status === 'Approved')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const hasApprovedContribution = contributions.some(c => c.status === 'Completed' || c.status === 'Approved');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Profile Card */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Welcome back, {user?.fullName || user?.email || 'Valued Donor'}!
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-300 text-sm">
                            {(user?.towerNumber || user?.flatNumber) && (
                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                    <Building2 className="w-4 h-4 text-blue-300" />
                                    Tower {user.towerNumber || 'N/A'}, Flat {user.flatNumber || 'N/A'}
                                </span>
                            )}
                            {user?.mobileNumber && (
                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                    <Phone className="w-4 h-4 text-blue-300" />
                                    {user.mobileNumber}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <a
                            href="/donor-guide.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
                            title="Open Donor Process & Help Guide"
                        >
                            <HelpCircle className="w-5 h-5 text-slate-950" /> Help & Guide
                        </a>
                        <button
                            onClick={() => openContributionModal()}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
                        >
                            <PlusCircle className="w-5 h-5" /> Make Contribution
                        </button>
                        <button
                            onClick={() => navigate('/donor-portal/register-events')}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
                        >
                            <Layers className="w-5 h-5" /> Register Multiple Events
                        </button>
                        <div className="relative group" title={!hasApprovedContribution ? "You need to contribute to Register for Stall / Events" : undefined}>
                            <button
                                onClick={() => { if (hasApprovedContribution) openChoiceModal('stall'); }}
                                disabled={!hasApprovedContribution}
                                className={`flex items-center gap-2 font-medium px-4 py-2.5 rounded-xl border transition-all ${
                                    hasApprovedContribution
                                        ? "bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
                                        : "bg-white/5 text-slate-400 border-white/10 cursor-not-allowed opacity-60"
                                }`}
                            >
                                <Store className="w-5 h-5" /> Register Event
                            </button>
                            {!hasApprovedContribution && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-1.5 px-3 z-20 whitespace-nowrap shadow-lg text-center pointer-events-none">
                                    You need to contribute to Register for Stall / Events
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Stats Cards */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Contributions</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">₹{totalDonated.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Heart className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stall Registrations</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{stallRegistrations.length}</p>
                        <span className="text-xs text-slate-500">{approvedStalls.length} Approved, {pendingStalls.length} Pending</span>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Store className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Registrations</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{eventRegistrations.length}</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Events</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{upcomingEvents.length}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Bell className="w-6 h-6" />
                    </div>
                </div>
            </div> */}

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
                    {/* <button
                        onClick={() => setActiveTab('stalls')}
                        className={`px-5 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'stalls' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Store className="w-4 h-4" />
                        My Stall Registrations ({stallRegistrations.length})
                    </button> */}
                    <button
                        onClick={() => setActiveTab('contributions')}
                        className={`px-5 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'contributions' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Heart className="w-4 h-4" />
                        My Contributions ({contributions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`px-5 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'events' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        My Event Registrations ({eventRegistrations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`px-5 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'announcements' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Bell className="w-4 h-4" />
                        Upcoming Events ({upcomingEvents.length})
                    </button>
                </div>

                <div className="p-6">
                    {/* Tab 1: Stall Registrations */}
                    {activeTab === 'stalls' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">Stall Registration & Approval Statuses</h3>
                                <div className="flex items-center gap-2">
                                    {/* <button
                                        onClick={() => { if (hasApprovedContribution) openChoiceModal('stall'); }}
                                        disabled={!hasApprovedContribution}
                                        className={`px-3 py-1.5 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                                            hasApprovedContribution
                                                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        }`}
                                    >
                                        <PlusCircle className="w-4 h-4" /> Register New Stall
                                    </button> */}
                                    <button
                                        onClick={fetchPortalData}
                                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Refresh"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {stallRegistrations.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">No stall registrations found.</p>
                                    <p className="text-xs text-slate-400 mt-1">Register a stall for upcoming festivals directly from your donor portal.</p>
                                    {/* <div className="relative group inline-block mt-4" title={!hasApprovedContribution ? "You need to contribute to Register for Stall / Events" : undefined}>
                                        <button
                                            onClick={() => { if (hasApprovedContribution) openChoiceModal('stall'); }}
                                            disabled={!hasApprovedContribution}
                                            className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
                                                hasApprovedContribution
                                                    ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                            }`}
                                        >
                                            Browse Festival Stalls
                                        </button>
                                        {!hasApprovedContribution && (
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-1.5 px-3 z-20 whitespace-nowrap shadow-lg text-center pointer-events-none">
                                                You need to contribute to Register for Stall / Events
                                            </div>
                                        )}
                                    </div> */}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase border-b border-slate-200">
                                            <tr>
                                                <th className="p-3">Festival</th>
                                                <th className="p-3">Registrant / Contact</th>
                                                <th className="p-3">Stall Dates</th>
                                                <th className="p-3">Tables</th>
                                                <th className="p-3">Total Payment</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Submitted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {stallRegistrations.map((s) => (
                                                <tr key={s.id} className="hover:bg-slate-50/80">
                                                    <td className="p-3 font-semibold text-slate-800">{s.festivalName || 'Festival'}</td>
                                                    <td className="p-3">
                                                        <div>{s.registrantName}</div>
                                                        <div className="text-xs text-slate-400">{s.contactNumber}</div>
                                                    </td>
                                                    <td className="p-3 text-xs">
                                                        {s.stallDates && s.stallDates.length > 0 
                                                            ? s.stallDates.map(d => new Date(d).toLocaleDateString()).join(', ')
                                                            : 'N/A'
                                                        }
                                                    </td>
                                                    <td className="p-3">{s.numberOfTables} Table(s)</td>
                                                    <td className="p-3 font-semibold text-slate-800">₹{Number(s.totalPayment).toLocaleString()}</td>
                                                    <td className="p-3">
                                                        {s.status === 'Approved' && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                                            </span>
                                                        )}
                                                        {s.status === 'Pending' && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                                <Clock className="w-3.5 h-3.5" /> Pending Review
                                                            </span>
                                                        )}
                                                        {s.status === 'Rejected' && (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                                    <XCircle className="w-3.5 h-3.5" /> Rejected
                                                                </span>
                                                                {s.rejectionReason && (
                                                                    <p className="text-xs text-red-600 mt-1 max-w-xs">{s.rejectionReason}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-xs text-slate-400">
                                                        {new Date(s.submittedAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: My Contributions */}
                    {activeTab === 'contributions' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">My Contribution History</h3>
                                    <a 
                                        href="/donor-guide.html#approval-process" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 mt-0.5"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> How does the contribution approval process work?
                                    </a>
                                </div>
                                <button
                                    onClick={() => openContributionModal()}
                                    className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                >
                                    <PlusCircle className="w-4 h-4" /> Add Contribution
                                </button>
                            </div>

                            {contributions.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">No contributions recorded yet.</p>
                                    <button
                                        onClick={() => openContributionModal()}
                                        className="mt-3 px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Make a Contribution
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase border-b border-slate-200">
                                            <tr>
                                                <th className="p-3">Receipt No</th>
                                                <th className="p-3">Campaign / Type</th>
                                                <th className="p-3">Amount</th>
                                                <th className="p-3">Coupons</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Proof</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3 text-center">Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {contributions.map((c) => (
                                                <tr key={c.id} className="hover:bg-slate-50/80">
                                                    <td className="p-3 text-xs font-bold font-mono text-blue-700">
                                                        {formatReceiptNo(c.id, c.type === 'Miscellaneous' || c.type?.startsWith('Miscellaneous:') ? 'misc' : 'contribution')}
                                                    </td>
                                                    <td className="p-3 font-semibold text-slate-800">
                                                        {c.campaignName || c.type || 'General Donation'}
                                                    </td>
                                                    <td className="p-3 font-bold text-slate-900">₹{Number(c.amount).toLocaleString()}</td>
                                                    <td className="p-3">{c.numberOfCoupons || 0}</td>
                                                    <td className="p-3 text-xs text-slate-500">
                                                        {new Date(c.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3">
                                                        {c.image ? (
                                                            <button
                                                                onClick={() => setViewingImage(c.image!)}
                                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                                                            >
                                                                <img src={c.image} alt="Proof thumbnail" className="w-5 h-5 rounded object-cover" />
                                                                View Proof
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">None</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                            c.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                            c.status === 'Failed' || c.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        }`}>
                                                            {c.status === 'Pending' ? 'Pending Approval' : c.status === 'Failed' || c.status === 'Rejected' ? 'Rejected' : 'Approved'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => openReceipt(c)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                                                            title="View and download printable receipt"
                                                        >
                                                            <Receipt className="w-3.5 h-3.5" /> View Receipt
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: My Event Registrations */}
                    {activeTab === 'events' && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-200">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        <Ticket className="w-5 h-5 text-blue-600" /> My Event Registrations
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                        <span className="text-xs text-slate-500">
                                            View participant passes, form details, and registration status for upcoming events.
                                        </span>
                                        <a
                                            href="/donor-guide.html#single-event"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                                        >
                                            <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Single & Multiple Event Registration Guide
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate('/donor-portal/register-events')}
                                        className="px-3.5 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <Layers className="w-4 h-4" /> Register for Multiple Events
                                    </button>
                                    <button
                                        onClick={() => { if (hasApprovedContribution) openChoiceModal('event'); }}
                                        disabled={!hasApprovedContribution}
                                        className={`px-3 py-1.5 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                                            hasApprovedContribution
                                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer border border-slate-200"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        }`}
                                    >
                                        <PlusCircle className="w-4 h-4" /> Single Event Modal
                                    </button>
                                </div>
                            </div>

                            {eventRegistrations.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">You haven't registered for any events yet.</p>
                                    <div className="flex justify-center gap-3 mt-4">
                                        <button
                                            onClick={() => navigate('/donor-portal/register-events')}
                                            className="px-4 py-2 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                                        >
                                            Register for Multiple Events
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(
                                        eventRegistrations.reduce<Record<string, EventRegistrationItem[]>>((acc, reg) => {
                                            const key = `${reg.eventId || reg.eventName}`;
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(reg);
                                            return acc;
                                        }, {})
                                    ).map(([groupKey, regs]) => {
                                        const firstReg = regs[0];
                                        return (
                                            <div key={groupKey} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                                {/* Group Banner Header */}
                                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-extrabold text-white text-base sm:text-lg">{firstReg.eventName || 'Festival Event'}</h4>
                                                            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 font-bold text-xs rounded-full border border-blue-400/30">
                                                                {regs.length} Participant{regs.length > 1 ? 's' : ''} Registered
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1.5 font-medium">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                                                {firstReg.eventDate ? new Date(firstReg.eventDate).toLocaleDateString() : 'TBA'}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                                Venue: {firstReg.venue || 'Main Grounds'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Participant Cards Grid */}
                                                <div className="p-4 sm:p-5 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {regs.map((reg, idx) => {
                                                        const pName = getParticipantName(reg);
                                                        const pPhone = getParticipantPhone(reg);
                                                        const pEmail = getParticipantEmail(reg);
                                                        const pTowerFlat = getParticipantTowerFlat(reg);
                                                        const extraFields = getExtraFormData(reg.formData);

                                                        return (
                                                            <div key={reg.id || idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
                                                                <div className="space-y-3">
                                                                    {/* Header row */}
                                                                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                                                        <div>
                                                                            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                                                                                Participant #{idx + 1}
                                                                            </span>
                                                                            <h5 className="font-bold text-slate-900 text-sm mt-0.5">{pName}</h5>
                                                                        </div>
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] rounded-md">
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed
                                                                        </span>
                                                                    </div>

                                                                    {/* Contact & Flat Info */}
                                                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                                        {pPhone && (
                                                                            <div className="flex items-center gap-1.5 truncate">
                                                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                                <span className="truncate">{pPhone}</span>
                                                                            </div>
                                                                        )}
                                                                        {pTowerFlat && (
                                                                            <div className="flex items-center gap-1.5 truncate">
                                                                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                                <span className="truncate">Flat: {pTowerFlat}</span>
                                                                            </div>
                                                                        )}
                                                                        {pEmail && (
                                                                            <div className="col-span-2 flex items-center gap-1.5 truncate">
                                                                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                                <span className="truncate">{pEmail}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Extra Custom Form Answers */}
                                                                    {extraFields.length > 0 && (
                                                                        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                                                                            {extraFields.map(([k, v]) => (
                                                                                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded-md border border-slate-200">
                                                                                    <span className="font-semibold text-slate-500">{k}:</span> {String(v)}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                                                    <span className="text-slate-400 text-[11px]">
                                                                        Reg: {new Date(reg.submittedAt).toLocaleDateString()}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        {reg.paymentProofImage && (
                                                                            <button
                                                                                onClick={() => setViewingImage(reg.paymentProofImage || null)}
                                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                                                                                title="View Verification Proof"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => setSelectedRegForDetails(reg)}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-[11px] cursor-pointer"
                                                                        >
                                                                            <FileText className="w-3 h-3 text-blue-400" /> Details Pass
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 4: Upcoming Events */}
                    {activeTab === 'announcements' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 text-lg mb-2">Upcoming Events & Announcements</h3>
                            {upcomingEvents.length === 0 ? (
                                <p className="text-slate-500 text-sm">No upcoming events scheduled right now.</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map((event) => (
                                        <div key={event.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow flex justify-between items-center gap-4">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base">{event.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-600">
                                                    <span>📅 {new Date(event.eventDate).toLocaleDateString()}</span>
                                                    <span>📍 {event.venue}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!hasApprovedContribution) return;
                                                    if (event.registrationFormSchema) {
                                                        setSelectedEventForRegister(event as unknown as PublicEvent);
                                                    } else {
                                                        try {
                                                            const res = await fetch(`${API_URL}/public/events`);
                                                            if (res.ok) {
                                                                const eventsList: PublicEvent[] = await res.json();
                                                                const fullEvt: PublicEvent = eventsList.find(e => e.id === event.id) || {
                                                                    id: event.id,
                                                                    name: event.name,
                                                                    description: event.description || '',
                                                                    eventDate: event.eventDate,
                                                                    startTime: event.startTime || '18:00',
                                                                    endTime: null,
                                                                    venue: event.venue,
                                                                    registrationFormSchema: []
                                                                };
                                                                setSelectedEventForRegister(fullEvt);
                                                            }
                                                        } catch {
                                                            setSelectedEventForRegister({
                                                                id: event.id,
                                                                name: event.name,
                                                                description: event.description || '',
                                                                eventDate: event.eventDate,
                                                                startTime: event.startTime || '18:00',
                                                                endTime: null,
                                                                venue: event.venue,
                                                                registrationFormSchema: []
                                                            });
                                                        }
                                                    }
                                                }}
                                                disabled={!hasApprovedContribution}
                                                className={`px-3.5 py-1.5 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
                                                    hasApprovedContribution
                                                        ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                }`}
                                            >
                                                Register Now
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Proof Viewing Modal */}
            {viewingImage && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setViewingImage(null)}>
                    <div className="relative max-w-2xl w-full bg-white rounded-2xl p-4 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800 text-sm">Payment Proof / Receipt</h3>
                            <button onClick={() => setViewingImage(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center">
                                ✕
                            </button>
                        </div>
                        <div className="max-h-[75vh] overflow-auto flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <img src={viewingImage} alt="Contribution payment proof" className="max-h-[70vh] object-contain rounded-lg shadow-sm" />
                        </div>
                    </div>
                </div>
            )}

            {/* Choice Modal for Stall or Event Registration */}
            {isChoiceModalOpen && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={() => setIsChoiceModalOpen(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                            <div>
                                <h3 className="font-bold text-slate-800 text-xl">Register for Stall or Event</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Select what you would like to register for below</p>
                            </div>
                            <button onClick={() => setIsChoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Choice Tabs */}
                        <div className="flex border-b border-slate-200 mt-4">
                            {/* <button
                                onClick={() => setChoiceTab('stall')}
                                className={`px-4 py-2.5 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                                    choiceTab === 'stall' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Store className="w-4 h-4" /> Festival Stalls ({publicFestivals.length})
                            </button> */}
                            <button
                                onClick={() => setChoiceTab('event')}
                                className={`px-4 py-2.5 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                                    choiceTab === 'event' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Calendar className="w-4 h-4" /> Events ({publicEventsList.length})
                            </button>
                        </div>

                        {/* Choice List Content */}
                        <div className="p-4 overflow-y-auto flex-1 space-y-4">
                            {isFetchingChoiceData ? (
                                <div className="py-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-xs text-slate-500 mt-2">Loading available registrations...</p>
                                </div>
                            ) : choiceTab === 'stall' ? (
                                publicFestivals.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                        No active festivals available for stall registration at this time.
                                    </div>
                                ) : (
                                    publicFestivals.map(fest => (
                                        <div key={fest.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base">{fest.name}</h4>
                                                <p className="text-xs text-slate-600 mt-1">{fest.description}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                                                    <span>📅 Stall Dates: {fest.stallStartDate ? new Date(fest.stallStartDate).toLocaleDateString() : 'TBA'} - {fest.stallEndDate ? new Date(fest.stallEndDate).toLocaleDateString() : 'TBA'}</span>
                                                    <span>💰 ₹{fest.stallPricePerTablePerDay || 0}/table/day</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsChoiceModalOpen(false);
                                                    setSelectedFestivalForStall(fest);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                                            >
                                                Register Stall
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : (
                                publicEventsList.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                        No upcoming events available for registration at this time.
                                    </div>
                                ) : (
                                    publicEventsList.map(evt => (
                                        <div key={evt.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base">{evt.name}</h4>
                                                <p className="text-xs text-slate-600 mt-1">{evt.description}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                                                    <span>📅 Date: {evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : 'TBA'} ({evt.startTime || 'TBA'})</span>
                                                    <span>📍 Venue: {evt.venue || 'Main Grounds'}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsChoiceModalOpen(false);
                                                    setSelectedEventForRegister(evt);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                                            >
                                                Register for Event
                                            </button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stall Registration Modal */}
            {selectedFestivalForStall && (
                <StallRegistrationModal
                    festival={selectedFestivalForStall}
                    onClose={() => {
                        setSelectedFestivalForStall(null);
                        fetchPortalData();
                    }}
                />
            )}

            {/* Event Registration Modal */}
            {selectedEventForRegister && (
                <RegistrationModal
                    event={selectedEventForRegister}
                    onClose={() => {
                        setSelectedEventForRegister(null);
                        fetchPortalData();
                    }}
                />
            )}

            {/* Registration Details Modal */}
            {selectedRegForDetails && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedRegForDetails(null)}>
                    <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 relative">
                            <button
                                onClick={() => setSelectedRegForDetails(null)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/30 text-blue-300 text-[11px] font-bold rounded-full uppercase tracking-wider mb-2">
                                <Ticket className="w-3.5 h-3.5" /> Event Registration Pass
                            </span>
                            <h3 className="text-xl font-extrabold text-white">{selectedRegForDetails.eventName || 'Festival Event'}</h3>
                            <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 font-medium">
                                <span>📅 Date: {selectedRegForDetails.eventDate ? new Date(selectedRegForDetails.eventDate).toLocaleDateString() : 'TBA'}</span>
                                <span>📍 Venue: {selectedRegForDetails.venue || 'Main Grounds'}</span>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-5 text-sm">
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Participant Name</span>
                                    <span className="font-extrabold text-slate-900 text-base">{getParticipantName(selectedRegForDetails)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Contact Phone</span>
                                        <span className="font-bold text-slate-800">{getParticipantPhone(selectedRegForDetails) || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Email Address</span>
                                        <span className="font-bold text-slate-800 truncate block">{getParticipantEmail(selectedRegForDetails) || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Tower & Flat</span>
                                        <span className="font-bold text-slate-800">{getParticipantTowerFlat(selectedRegForDetails) || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Registration Ref ID</span>
                                        <span className="font-bold text-slate-800">#EVT-{selectedRegForDetails.id}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Form Answers */}
                            {getExtraFormData(selectedRegForDetails.formData).length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Form Details:</h4>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        {getExtraFormData(selectedRegForDetails.formData).map(([label, value]) => (
                                            <div key={label} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                                                <span className="text-slate-400 block font-semibold">{label}</span>
                                                <span className="font-bold text-slate-900 mt-0.5 block">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment Proof Preview if present */}
                            {selectedRegForDetails.paymentProofImage && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Proof Attached:</h4>
                                    <div className="relative group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center">
                                        <img
                                            src={selectedRegForDetails.paymentProofImage}
                                            alt="Payment Proof"
                                            className="object-contain max-h-48 w-full"
                                        />
                                        <button
                                            onClick={() => setViewingImage(selectedRegForDetails.paymentProofImage || null)}
                                            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1 cursor-pointer"
                                        >
                                            <Eye className="w-4 h-4" /> Enlarge Proof
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100">
                                <span>Registered on {new Date(selectedRegForDetails.submittedAt).toLocaleString()}</span>
                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Registration
                                </span>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                                Print Pass
                            </button>
                            <button
                                onClick={() => setSelectedRegForDetails(null)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        </div>
    );
};

export default DonorPortalPage;
