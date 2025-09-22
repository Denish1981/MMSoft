import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { formatUTCDate } from '../utils/formatting';
import type { ParticipantRegistrationHistory } from '../types/index';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';

const ParticipantDetailsPage: React.FC = () => {
    const { name, phone } = useParams<{ name: string; phone: string }>();
    const { token, logout } = useAuth();
    const [history, setHistory] = useState<ParticipantRegistrationHistory | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchHistory = useCallback(async () => {
        if (!name || !phone || !token) return;
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_URL}/participants/${name}/${phone}`, { headers });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to fetch participant history');
            const data = await response.json();
            setHistory(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [name, phone, token, logout]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (isLoading) return <div className="text-center p-8">Loading participant details...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!history) return <div className="text-center p-8">Participant not found.</div>;
    
    const { participant, registrations } = history;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="flex items-center space-x-4">
                    <Link to="/participants" className="text-slate-500 hover:text-slate-800" aria-label="Back to participants">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{participant.name}</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                           {participant.email && <span>📧 {participant.email}</span>}
                           {participant.phoneNumber && <span>📞 {participant.phoneNumber}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Event Registrations ({registrations.length})
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Event Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Event Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registered On</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {registrations.map((reg, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{reg.eventName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(reg.eventDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(reg.submittedAt, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {registrations.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            No registration history found for this participant.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParticipantDetailsPage;
