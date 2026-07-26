import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Calendar, MapPin, Phone, Mail, User, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import type { TrustDetails } from '../types';

const defaultTrustData: TrustDetails = {
    name: "Gold Towers Mitra Mandal Trust",
    registrationNumber: "REG-2018/GTMM-78452",
    registrationDate: "2018-04-12",
    address: "Gold Towers Co-Operative Housing Society, Sector 12, Kharghar, Navi Mumbai - 410210, Maharashtra, India",
    contactNumber: "+91 98201 12345 / +91 98202 67890",
    email: "contact@goldtowersmandal.org",
    members: [
        { id: 1, name: "Rajesh Sharma", designation: "President / Managing Trustee", contactNumber: "+91 98201 12345" },
        { id: 2, name: "Suresh Patel", designation: "Vice President", contactNumber: "+91 98202 23456" },
        { id: 3, name: "Amit Shah", designation: "General Secretary", contactNumber: "+91 98203 34567" },
        { id: 4, name: "Ramesh Mehta", designation: "Treasurer", contactNumber: "+91 98204 45678" },
        { id: 5, name: "Vikas Joshi", designation: "Executive Member", contactNumber: "+91 98205 56789" },
        { id: 6, name: "Sunita Verma", designation: "Executive Member", contactNumber: "+91 98206 67890" }
    ]
};

export const TrustDetailsPage: React.FC = () => {
    const { isAuthenticated, hasPermission } = useAuth();
    const [trustData, setTrustData] = useState<TrustDetails>(defaultTrustData);
    const [isLoading, setIsLoading] = useState(true);

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    useEffect(() => {
        let isMounted = true;
        const fetchTrustDetails = async () => {
            try {
                const response = await fetch(`${API_URL}/public/trust-details`);
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted && data) {
                        setTrustData(data);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch trust details from API, using defaults:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchTrustDetails();
        return () => {
            isMounted = false;
        };
    }, []);

    const formatDateStr = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr || '';
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-100">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="text-2xl font-bold text-slate-800 tracking-wider">
                            Gold Towers Mitra Mandal Trust
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/"
                            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Home
                        </Link>
                        <Link
                            to={dashboardTarget}
                            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-amber-700 transition-all font-medium"
                        >
                            {isAuthenticated ? "Go to Dashboard" : "Login"}
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-10 flex-grow max-w-5xl space-y-10">
                {/* Back Link */}
                <div>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Home Page
                    </Link>
                </div>

                {/* Page Title Header */}
                <div className="space-y-2 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-3">
                        <Building2 className="w-8 h-8 text-orange-600 shrink-0" />
                        Trust Details & Governing Body
                    </h1>
                    <p className="text-slate-600 text-base max-w-2xl">
                        Official registration, contact information, and executive trust committee members of Gold Towers Mitra Mandal Trust.
                    </p>
                </div>

                {/* Trust Information Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 md:p-8 text-white">
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg uppercase tracking-wider mb-2">
                            Registered Organization
                        </span>
                        <h2 className="text-2xl md:text-3xl font-extrabold">
                            {trustData.name}
                        </h2>
                    </div>

                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Left Column: Registration & Dates */}
                        <div className="space-y-6 pt-2 md:pt-0">
                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Registration Number
                                    </span>
                                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                                        {trustData.registrationNumber}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Registration Date
                                    </span>
                                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                                        {formatDateStr(trustData.registrationDate)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Trust Contact Number
                                    </span>
                                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                                        {trustData.contactNumber}
                                    </span>
                                </div>
                            </div>

                            {trustData.email && (
                                <div className="flex items-start gap-3.5">
                                    <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Trust Email
                                        </span>
                                        <span className="text-base font-bold text-slate-900 mt-0.5 block">
                                            {trustData.email}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Address */}
                        <div className="space-y-6 pt-6 md:pt-0 md:pl-6">
                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Trust Registered Address
                                    </span>
                                    <p className="text-base font-medium text-slate-800 mt-1 leading-relaxed">
                                        {trustData.address}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust Members Section */}
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                                <Users className="w-6 h-6 text-orange-600" />
                                Executive Trust Committee Members
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Designated officials and executive committee members responsible for trust operations.
                            </p>
                        </div>
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full w-fit">
                            {trustData.members.length} Members
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trustData.members.map((member, idx) => (
                            <div
                                key={member.id || idx}
                                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-base border border-slate-200 shrink-0">
                                            <User className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 leading-snug">
                                                {member.name}
                                            </h3>
                                            <span className="inline-block text-xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200/60 mt-0.5">
                                                {member.designation}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Contact
                                    </span>
                                    <a
                                        href={`tel:${member.contactNumber}`}
                                        className="font-bold text-slate-800 hover:text-orange-600 transition-colors flex items-center gap-1.5"
                                    >
                                        <Phone className="w-3.5 h-3.5 text-orange-500" />
                                        {member.contactNumber}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="text-center py-6 text-sm text-slate-500 border-t border-slate-200 bg-white">
                <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div>
                        © {new Date().getFullYear()} GTMM Trust. All rights reserved.
                    </div>
                    <div className="flex items-center space-x-6">
                        <Link to="/" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                            Home
                        </Link>
                        <Link to="/trust-details" className="text-orange-600 font-semibold hover:underline">
                            Trust Details
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TrustDetailsPage;
