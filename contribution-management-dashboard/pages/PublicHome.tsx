import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import type { ScheduleMaster } from '../types';
import { sortSchedules, sortScheduleEntries } from '../utils/scheduleUtils';

export const PublicHomePage: React.FC = () => {
    const { isAuthenticated, hasPermission } = useAuth();
    const [activeSchedules, setActiveSchedules] = useState<ScheduleMaster[]>([]);
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    useEffect(() => {
        let isMounted = true;
        const fetchActiveSchedules = async () => {
            try {
                const response = await fetch(`${API_URL}/public/schedules/active`);
                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setActiveSchedules(sortSchedules(data || []));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch public active schedules:', err);
            } finally {
                if (isMounted) setIsLoadingSchedules(false);
            }
        };

        fetchActiveSchedules();
        return () => {
            isMounted = false;
        };
    }, []);

    const formatDateStr = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr || '';
        }
    };

    const formatDateStrWithYear = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr || '';
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            <header className="bg-white shadow-sm border-b border-slate-100">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <Link to="/trust-details" className="text-2xl font-bold text-slate-800 tracking-wider">
                            Gold Towers Mitra Mandal Trust
                        </Link>
                        {/* <div className="flex items-center space-x-6">
                            <Link to="/trust-details" className="text-sm md:text-base font-medium text-slate-600 hover:text-orange-600 transition-colors">
                                Trust Details
                            </Link>
                        </div> */}
                    </div>
                    <Link
                        to={dashboardTarget}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg shadow-md hover:from-orange-600 hover:to-amber-700 transition-all font-medium"
                    >
                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>

            <main className="container mx-auto px-6 py-12 flex-grow space-y-12">
                {/* Active Festival Schedule Section */}
                {!isLoadingSchedules && activeSchedules.length > 0 && (
                    <div className="max-w-5xl mx-auto space-y-8 pt-6">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-extrabold text-slate-900">
                                Upcoming Festival Schedule
                            </h2>
                            <p className="text-sm text-slate-500">
                                Detailed timetable and event timings for our current celebration
                            </p>
                        </div>

                        <div className="space-y-8">
                            {activeSchedules.map((schedule) => (
                                <div 
                                    key={schedule.id}
                                    className="bg-white rounded-3xl border border-orange-200 shadow-xl overflow-hidden"
                                >
                                    {/* Schedule Card Banner */}
                                    <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg uppercase tracking-wider mb-2">
                                                {schedule.festivalName || 'Festival Celebration'}
                                            </span>
                                            <h3 className="text-2xl md:text-3xl font-extrabold">
                                                {schedule.title || `${schedule.festivalName} Schedule`}
                                            </h3>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 text-center shrink-0">
                                            <div className="text-xs text-orange-100 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                                <Calendar className="w-4 h-4" /> Schedule Dates
                                            </div>
                                            <div className="text-sm font-bold text-white mt-0.5">
                                                {formatDateStrWithYear(schedule.startDate)} — {formatDateStrWithYear(schedule.endDate)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Entries Table */}
                                    <div className="p-6 md:p-8">
                                        {!schedule.entries || schedule.entries.length === 0 ? (
                                            <p className="text-center text-slate-500 text-sm py-4 italic">
                                                Schedule details are being prepared. Please check back soon!
                                            </p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                                                <table className="w-full text-left text-sm border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                                            <th className="py-3.5 px-5 w-40">Date</th>
                                                            <th className="py-3.5 px-5">Event / Activity</th>
                                                            <th className="py-3.5 px-5 w-52">Timings</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {sortScheduleEntries(schedule.entries).map((entry, idx) => (
                                                            <tr key={entry.id || idx} className="hover:bg-orange-50/40 transition-colors">
                                                                <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                                                                    {formatDateStr(entry.eventDate)}, {entry.day || '—'}

                                                                </td>
                                                                <td className="py-4 px-5 font-medium text-slate-800">
                                                                    {entry.event}
                                                                </td>
                                                                <td className="py-4 px-5 font-semibold text-orange-600 whitespace-nowrap flex items-center gap-1.5">
                                                                    <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                                                                    {entry.timings}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <footer className="py-6 text-sm text-slate-500 border-t border-slate-200 bg-white">
                <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                    <div>
                        © {new Date().getFullYear()} GTMM Trust. All rights reserved.
                    </div>
                    <div className="flex items-center space-x-6">
                        <Link to="/trust-details" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                            Trust Details
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicHomePage;
