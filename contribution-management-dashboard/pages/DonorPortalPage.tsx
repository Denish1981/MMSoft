import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { API_URL } from '../config';
import { 
    Heart, Calendar, Store, Bell, CheckCircle2, XCircle, Clock, 
    ChevronRight, RefreshCw, FileText, PlusCircle, Building2, Phone, User as UserIcon 
} from 'lucide-react';

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
}

const DonorPortalPage: React.FC = () => {
    const { user, token } = useAuth();
    const { openContributionModal } = useModal();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stalls' | 'contributions' | 'events' | 'announcements'>('stalls');
    
    const [contributions, setContributions] = useState<ContributionItem[]>([]);
    const [stallRegistrations, setStallRegistrations] = useState<StallRegistrationItem[]>([]);
    const [eventRegistrations, setEventRegistrations] = useState<EventRegistrationItem[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

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

    useEffect(() => {
        fetchPortalData();
    }, [fetchPortalData]);

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

    const totalDonated = contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Profile Card */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-300 text-sm font-medium mb-1">
                            <UserIcon className="w-4 h-4" /> Donor Portal & Updates
                        </div>
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
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-xl border border-white/20 transition-all"
                        >
                            <Store className="w-5 h-5" /> Register Stall / Event
                        </button>
                    </div>
                </div>
            </div>

            {/* Updates Banner for Approvals / Rejections */}
            {rejectedStalls.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-red-800 font-bold">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span>Stall Registration Update Required</span>
                    </div>
                    {rejectedStalls.map(stall => (
                        <div key={stall.id} className="text-sm text-red-700 bg-red-100/50 p-2.5 rounded-lg">
                            <span className="font-semibold">{stall.festivalName || 'Festival'} Stall:</span> Status: <span className="font-bold">Rejected</span>.
                            {stall.rejectionReason && (
                                <span className="block mt-1 font-mono text-xs text-red-800">
                                    Reason: "{stall.rejectionReason}"
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {approvedStalls.length > 0 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-green-800 font-bold">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span>Approved Stall Registrations ({approvedStalls.length})</span>
                    </div>
                    <p className="text-xs text-green-700">
                        Your stall registration(s) have been approved and recorded in the system.
                    </p>
                </div>
            )}

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
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">Stall Registration & Approval Statuses</h3>
                                <button
                                    onClick={fetchPortalData}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>

                            {stallRegistrations.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">No stall registrations found.</p>
                                    <p className="text-xs text-slate-400 mt-1">Register a stall for upcoming festivals on the home page.</p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Browse Festival Stalls
                                    </button>
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
                                                <th className="p-3">Campaign / Type</th>
                                                <th className="p-3">Amount</th>
                                                <th className="p-3">Coupons</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {contributions.map((c) => (
                                                <tr key={c.id} className="hover:bg-slate-50/80">
                                                    <td className="p-3 font-semibold text-slate-800">
                                                        {c.campaignName || c.type || 'General Donation'}
                                                    </td>
                                                    <td className="p-3 font-bold text-slate-900">₹{Number(c.amount).toLocaleString()}</td>
                                                    <td className="p-3">{c.numberOfCoupons || 0}</td>
                                                    <td className="p-3 text-xs text-slate-500">
                                                        {new Date(c.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                            {c.status || 'Completed'}
                                                        </span>
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
                            <h3 className="font-bold text-slate-800 text-lg mb-2">My Event Registrations</h3>
                            {eventRegistrations.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">You haven't registered for any events yet.</p>
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
                                        <div key={event.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base">{event.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-600">
                                                    <span>📅 {new Date(event.eventDate).toLocaleDateString()}</span>
                                                    <span>📍 {event.venue}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate('/')}
                                                className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                View <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DonorPortalPage;
