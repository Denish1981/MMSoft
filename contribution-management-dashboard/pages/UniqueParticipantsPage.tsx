import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { exportToCsv, exportParticipantsZipByDate } from '../utils/exportUtils';
import { formatUTCDate } from '../utils/formatting';
import type { UniqueParticipant, DetailedEventParticipantExportItem } from '../types/index';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { useData } from '../contexts/DataContext';
import { FileArchive, Download, Loader2, FileSpreadsheet, Users, CalendarDays } from 'lucide-react';
import EventParticipantsByDateTab from '../components/participants/EventParticipantsByDateTab';

type ParticipantViewTab = 'all-participants' | 'by-event-date';

const UniqueParticipantsPage: React.FC = () => {
    const { token, logout } = useAuth();
    const { festivals } = useData();
    const [activeTab, setActiveTab] = useState<ParticipantViewTab>('all-participants');
    const [participants, setParticipants] = useState<UniqueParticipant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExportingZip, setIsExportingZip] = useState(false);
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [error, setError] = useState('');

    const [selectedFestivalId, setSelectedFestivalId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchParticipants = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const url = new URL(`${API_URL}/participants`, window.location.origin);
            if (selectedFestivalId !== 'all') {
                url.searchParams.append('festivalId', selectedFestivalId);
            }

            const response = await fetch(url.toString(), { headers });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to fetch participant data');
            const data = await response.json();
            setParticipants(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [token, logout, selectedFestivalId]);

    useEffect(() => {
        fetchParticipants();
    }, [fetchParticipants]);

    const filteredParticipants = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return participants.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.email && p.email.toLowerCase().includes(term)) ||
            (p.phoneNumber && p.phoneNumber.includes(term)) ||
            (p.towerNumber && p.towerNumber.toLowerCase().includes(term)) ||
            (p.flatNumber && p.flatNumber.toLowerCase().includes(term)) ||
            (p.events && p.events.some(e => e.toLowerCase().includes(term)))
        );
    }, [participants, searchTerm]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, rowsPerPage, selectedFestivalId]);

    const totalPages = Math.ceil(filteredParticipants.length / rowsPerPage);
    const paginatedParticipants = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredParticipants.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredParticipants, currentPage, rowsPerPage]);

    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    
    /**
     * Export a ZIP containing date-wise CSV files
     * - One CSV per distinct event date (with all events on that date)
     * - Group member names separated by commas
     * - Song track name and length included
     * - Rows sorted by registered date on (submittedAt ascending)
     */
    const handleExportZip = async () => {
        if (!token) return;
        setIsExportingZip(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const url = new URL(`${API_URL}/participants/export-detailed`, window.location.origin);
            if (selectedFestivalId !== 'all') {
                url.searchParams.append('festivalId', selectedFestivalId);
            }

            const response = await fetch(url.toString(), { headers });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to fetch detailed participant records for export');
            
            let data: DetailedEventParticipantExportItem[] = await response.json();

            // Filter if user searched
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                data = data.filter(item => 
                    (item.name && item.name.toLowerCase().includes(term)) ||
                    (item.email && item.email.toLowerCase().includes(term)) ||
                    (item.phoneNumber && item.phoneNumber.includes(term)) ||
                    (item.towerNumber && item.towerNumber.toLowerCase().includes(term)) ||
                    (item.flatNumber && item.flatNumber.toLowerCase().includes(term)) ||
                    (item.eventName && item.eventName.toLowerCase().includes(term))
                );
            }

            const selectedFestival = festivals.find(f => String(f.id) === String(selectedFestivalId));
            const festivalSlug = selectedFestival ? selectedFestival.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'all_festivals';
            const zipName = `unique_participants_by_date_${festivalSlug}`;

            await exportParticipantsZipByDate(data, zipName);
        } catch (err) {
            console.error('Error exporting participants zip:', err);
            alert(err instanceof Error ? err.message : 'Failed to export participants ZIP');
        } finally {
            setIsExportingZip(false);
        }
    };

    const handleExportCsv = () => {
        setIsExportingCsv(true);
        try {
            const dataToExport: Record<string, any>[] = [];
            filteredParticipants.forEach(p => {
                const formattedLastRegisteredDate = p.lastRegisteredAt ? formatUTCDate(p.lastRegisteredAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
                if (p.eventDetails && p.eventDetails.length > 0) {
                    p.eventDetails.forEach(detail => {
                        const formattedEventDate = detail.eventDate ? formatUTCDate(detail.eventDate) : 'N/A';
                        dataToExport.push({
                            'Participant Name': p.name,
                            'Tower Number': p.towerNumber || 'N/A',
                            'Flat Number': p.flatNumber || 'N/A',
                            'Email': p.email || 'N/A',
                            'Phone Number': p.phoneNumber || 'N/A',
                            'Event Participated': detail.eventName || 'N/A',
                            'Event Date': formattedEventDate,
                            'Total Registrations': p.registrationCount,
                            'Last Registered On': formattedLastRegisteredDate,
                        });
                    });
                } else if (p.events && p.events.length > 0) {
                    p.events.forEach(eventName => {
                        dataToExport.push({
                            'Participant Name': p.name,
                            'Tower Number': p.towerNumber || 'N/A',
                            'Flat Number': p.flatNumber || 'N/A',
                            'Email': p.email || 'N/A',
                            'Phone Number': p.phoneNumber || 'N/A',
                            'Event Participated': eventName,
                            'Event Date': 'N/A',
                            'Total Registrations': p.registrationCount,
                            'Last Registered On': formattedLastRegisteredDate,
                        });
                    });
                } else {
                    dataToExport.push({
                        'Participant Name': p.name,
                        'Tower Number': p.towerNumber || 'N/A',
                        'Flat Number': p.flatNumber || 'N/A',
                        'Email': p.email || 'N/A',
                        'Phone Number': p.phoneNumber || 'N/A',
                        'Event Participated': 'N/A',
                        'Event Date': 'N/A',
                        'Total Registrations': p.registrationCount,
                        'Last Registered On': formattedLastRegisteredDate,
                    });
                }
            });
            exportToCsv(dataToExport, 'unique_event_participants');
        } finally {
            setIsExportingCsv(false);
        }
    };

    if (isLoading) return <div className="text-center p-8">Loading participants...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            {/* Header & Tab navigation */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Unique Event Participants</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {activeTab === 'all-participants' 
                            ? 'Comprehensive list of participants across events with date-wise ZIP export.'
                            : 'View participants by scheduled event date in chronological registration order.'}
                    </p>
                </div>

                {/* View Switcher Tabs */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
                    <button
                        id="tab-all-participants"
                        onClick={() => setActiveTab('all-participants')}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === 'all-participants'
                                ? 'bg-white shadow-xs text-blue-700'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>All Unique Participants</span>
                        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                            {participants.length}
                        </span>
                    </button>

                    <button
                        id="tab-by-event-date"
                        onClick={() => setActiveTab('by-event-date')}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === 'by-event-date'
                                ? 'bg-white shadow-xs text-blue-700'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <CalendarDays className="w-4 h-4" />
                        <span>Participants by Event Date</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: ALL UNIQUE PARTICIPANTS */}
            {activeTab === 'all-participants' && (
                <div className="space-y-6">
                    {/* Action buttons & Filters */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="text-sm font-medium text-slate-600">
                            Showing <span className="font-bold text-slate-900">{filteredParticipants.length}</span> unique participant{filteredParticipants.length !== 1 ? 's' : ''}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Primary Export ZIP button */}
                            <button
                                id="export-zip-btn"
                                onClick={handleExportZip}
                                disabled={participants.length === 0 || isExportingZip}
                                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                title="Export a ZIP file with CSV files partitioned by event date (including song tracks, group members, and sorted by registration date)"
                            >
                                {isExportingZip ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                        <span>Generating ZIP...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileArchive className="w-4 h-4 text-indigo-200" />
                                        <span>Export ZIP (By Event Date)</span>
                                    </>
                                )}
                            </button>

                            {/* Secondary Export CSV button */}
                            <button
                                id="export-csv-btn"
                                onClick={handleExportCsv}
                                disabled={participants.length === 0 || isExportingCsv}
                                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                title="Export summary CSV"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Search Participants
                            </label>
                            <input
                                id="participant-search-input"
                                type="text"
                                placeholder="Search by name, phone, tower, flat, or event..."
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Filter By Festival
                            </label>
                            <select
                                id="festival-filter-select"
                                value={selectedFestivalId}
                                onChange={e => setSelectedFestivalId(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-white rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                aria-label="Filter by festival"
                            >
                                <option value="all">All Festivals</option>
                                {festivals.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Participants Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Participant Name</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tower</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Flat</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Phone Number</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Events Participated</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Total Events</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Last Registered</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {paginatedParticipants.map((p, index) => (
                                    <tr key={`${p.name}-${p.phoneNumber}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                            <Link 
                                                to={`/participants/${encodeURIComponent(p.name)}/${encodeURIComponent(p.phoneNumber || 'none')}`}
                                                className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                            >
                                                {p.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{p.towerNumber || 'N/A'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{p.flatNumber || 'N/A'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-xs">{p.phoneNumber || 'N/A'}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500 max-w-xs">
                                            {p.events && p.events.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {p.events.map((eventName, i) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                                                            {eventName}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">None</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-bold text-slate-700">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs">
                                                {p.registrationCount}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {formatUTCDate(p.lastRegisteredAt, { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                    </tr>
                                ))}
                                {filteredParticipants.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500">
                                            {participants.length === 0 ? "No participants found." : "No participants match your search criteria."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-center pt-2 gap-4">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={e => setRowsPerPage(Number(e.target.value))}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                                aria-label="Rows per page"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="text-sm font-medium text-slate-500" aria-live="polite">
                            Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({filteredParticipants.length} participants)
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Previous page"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Next page"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PARTICIPANTS BY EVENT DATE */}
            {activeTab === 'by-event-date' && (
                <EventParticipantsByDateTab
                    festivals={festivals}
                    selectedFestivalId={selectedFestivalId}
                />
            )}
        </div>
    );
};

export default UniqueParticipantsPage;
