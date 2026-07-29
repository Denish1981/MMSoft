import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useData } from '../contexts/DataContext';
import { API_URL } from '../config';
import { 
    Heart, Calendar, Store, Bell, CheckCircle2, XCircle, Clock, 
    RefreshCw, PlusCircle, Building2, Phone, User as UserIcon, X, Receipt
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
                        <button
                            onClick={() => openContributionModal()}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
                        >
                            <PlusCircle className="w-5 h-5" /> Make Contribution
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
                                <Store className="w-5 h-5" /> Register Stall / Event
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('stalls')}
                        className={`px-5 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'stalls' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Store className="w-4 h-4" />
                        My Stall Registrations ({stallRegistrations.length})
                    </button>
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
                                    <button
                                        onClick={() => { if (hasApprovedContribution) openChoiceModal('stall'); }}
                                        disabled={!hasApprovedContribution}
                                        className={`px-3 py-1.5 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                                            hasApprovedContribution
                                                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        }`}
                                    >
                                        <PlusCircle className="w-4 h-4" /> Register New Stall
                                    </button>
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
                                    <div className="relative group inline-block mt-4" title={!hasApprovedContribution ? "You need to contribute to Register for Stall / Events" : undefined}>
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
                                    </div>
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
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">My Contribution History</h3>
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
                        <div className="space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">My Event Registrations</h3>
                                <button
                                    onClick={() => { if (hasApprovedContribution) openChoiceModal('event'); }}
                                    disabled={!hasApprovedContribution}
                                    className={`px-3 py-1.5 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
                                        hasApprovedContribution
                                            ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    }`}
                                >
                                    <PlusCircle className="w-4 h-4" /> Register for Event
                                </button>
                            </div>

                            {eventRegistrations.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">You haven't registered for any events yet.</p>
                                    <button
                                        onClick={() => { if (hasApprovedContribution) openChoiceModal('event'); }}
                                        disabled={!hasApprovedContribution}
                                        className={`mt-3 px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
                                            hasApprovedContribution
                                                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                                : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                        }`}
                                    >
                                        Register for an Event
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {eventRegistrations.map((e) => (
                                        <div key={e.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{e.eventName || 'Festival Event'}</h4>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                    {e.eventDate ? new Date(e.eventDate).toLocaleDateString() : 'TBA'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                    Venue: {e.venue || 'Main Grounds'}
                                                </p>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-400 flex justify-between items-center">
                                                <span>Registered: {new Date(e.submittedAt).toLocaleDateString()}</span>
                                                <span className="text-green-600 font-semibold">Registered</span>
                                            </div>
                                        </div>
                                    ))}
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
                            <button
                                onClick={() => setChoiceTab('stall')}
                                className={`px-4 py-2.5 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                                    choiceTab === 'stall' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Store className="w-4 h-4" /> Festival Stalls ({publicFestivals.length})
                            </button>
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

            {/* Receipt Modal */}
            <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        </div>
    );
};

export default DonorPortalPage;
