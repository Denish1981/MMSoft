import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { exportToCsv } from '../utils/exportUtils';
import { formatUTCDate } from '../utils/formatting';
import type { UniqueParticipant } from '../types/index';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { useData } from '../contexts/DataContext';

const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const UniqueParticipantsPage: React.FC = () => {
    const { token, logout } = useAuth();
    const { festivals } = useData();
    const [participants, setParticipants] = useState<UniqueParticipant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            
            const url = new URL(`${API_URL}/participants`);
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
        return participants.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.phoneNumber && p.phoneNumber.includes(searchTerm))
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
    
    const handleExport = () => {
        const dataToExport = filteredParticipants.map(p => ({
            'Name': p.name,
            'Email': p.email || 'N/A',
            'Phone Number': p.phoneNumber || 'N/A',
            'Total Registrations': p.registrationCount,
            'Last Registered On': new Date(p.lastRegisteredAt).toLocaleString(),
        }));
        exportToCsv(dataToExport, 'unique_event_participants');
    };

    if (isLoading) return <div className="text-center p-8">Loading participants...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
             <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Unique Event Participants</h2>
                    <p className="text-sm text-slate-500">A list of all unique individuals who have registered for events.</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={participants.length === 0}
                    className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:bg-slate-400"
                >
                    <ExportIcon className="w-5 h-5 mr-2" />
                    Export to CSV
                </button>
            </div>
            
            <div className="mb-4 flex flex-col md:flex-row gap-4">
                 <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    className="w-full md:w-1/2 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    onChange={e => setSearchTerm(e.target.value)}
                />
                 <select
                    value={selectedFestivalId}
                    onChange={e => setSelectedFestivalId(e.target.value)}
                    className="w-full md:w-1/2 px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Filter by festival"
                >
                    <option value="all">All Festivals</option>
                    {festivals.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                            {/* <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th> */}
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone Number</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Total Registrations</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Registered On</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedParticipants.map((p, index) => (
                            <tr key={`${p.name}-${p.phoneNumber}-${index}`} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                    <Link 
                                        to={`/participants/${encodeURIComponent(p.name)}/${encodeURIComponent(p.phoneNumber || 'none')}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        {p.name}
                                    </Link>
                                </td>
                                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.email || 'N/A'}</td> */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.phoneNumber || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{p.registrationCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(p.lastRegisteredAt, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                            </tr>
                        ))}
                         {filteredParticipants.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-slate-500">
                                    {participants.length === 0 ? "No participants found." : "No participants match your search."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

             <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-4 border-t border-slate-200 gap-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <span>Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={e => setRowsPerPage(Number(e.target.value))}
                        className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        aria-label="Rows per page"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div className="text-sm text-slate-600" aria-live="polite">
                    Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({filteredParticipants.length} items)
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous page"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next page"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UniqueParticipantsPage;