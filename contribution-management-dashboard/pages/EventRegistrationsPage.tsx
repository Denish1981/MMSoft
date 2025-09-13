import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Split imports between react-router and react-router-dom to fix export resolution issues.
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import type { EventRegistration, RegistrationFormField } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { formatUTCDate } from '../utils/formatting';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { exportToCsv } from '../utils/exportUtils';

const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

interface EventDetails {
    name: string;
    festivalId: number;
    registrationFormSchema: RegistrationFormField[];
}

const EventRegistrationsPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const { token, logout } = useAuth();
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRegistrations = useCallback(async () => {
        if (!eventId || !token) return;
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await fetch(`${API_URL}/events/${eventId}/registrations`, { headers });

            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to fetch registration data');
            
            const data = await response.json();
            setRegistrations(data.registrations);
            setEventDetails(data.event);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, token, logout]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);
    
    const tableHeaders = useMemo(() => {
        if (!eventDetails) return [];

        const headers = new Map<string, string>();
        
        // Add dedicated fields first to establish a consistent order.
        headers.set('name', 'Full Name');
        headers.set('email', 'Email Address');

        // Add fields from the schema. This will overwrite the label for 'name' if it's different
        // and add all other custom fields.
        (eventDetails.registrationFormSchema || []).forEach(field => {
            headers.set(field.name, field.label);
        });
        
        // Add submission date at the end.
        headers.set('submittedAt', 'Registered On');

        return Array.from(headers.entries()).map(([key, label]) => ({ key, label }));
    }, [eventDetails]);

    const handleExport = () => {
        if (!eventDetails || registrations.length === 0) return;
        
        const dataToExport = registrations.map(r => {
            const row: Record<string, any> = {};
            tableHeaders.forEach(header => {
                 const value = getDisplayValue(r, header.key);
                 // Format for CSV readability
                 if (value === '✔️') row[header.label] = 'Yes';
                 else if (value === '❌') row[header.label] = 'No';
                 else row[header.label] = value;
            });
            return row;
        });
        
        const filename = `registrations_${eventDetails.name.replace(/\s+/g, '_')}`;
        exportToCsv(dataToExport, filename);
    };

    const getDisplayValue = (registration: EventRegistration, key: string): React.ReactNode => {
        if (key === 'submittedAt') {
            return formatUTCDate(registration.submittedAt, { dateStyle: 'medium', timeStyle: 'short' });
        }
        
        // Handle top-level special fields first
        if (key === 'name') return registration.name || 'N/A';
        if (key === 'email') return registration.email || 'N/A';

        // Then fallback to formData for custom fields
        const value = registration.formData[key];
        if (typeof value === 'boolean') {
            return value ? '✔️' : '❌';
        }
        return value || 'N/A';
    };


    if (isLoading) return <div className="text-center p-8">Loading registrations...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="flex items-center space-x-4">
                    {eventDetails && (
                        <Link to={`/festivals/${eventDetails.festivalId}/events`} className="text-slate-500 hover:text-slate-800" aria-label="Back to events">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </Link>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Event Registrations</h2>
                        <p className="text-slate-600">{eventDetails?.name || 'Loading...'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                        {registrations.length} Total Attendees
                    </h3>
                    <button
                        onClick={handleExport}
                        disabled={registrations.length === 0}
                        className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:bg-slate-400"
                    >
                        <ExportIcon className="w-5 h-5 mr-2" />
                        Export to CSV
                    </button>
                </div>

                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {tableHeaders.map(header => (
                                     <th key={header.key} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{header.label}</th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-slate-200">
                            {registrations.map(reg => (
                                <tr key={reg.id} className="hover:bg-slate-50">
                                    {tableHeaders.map(header => (
                                        <td key={header.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{getDisplayValue(reg, header.key)}</td>
                                    ))}
                                </tr>
                            ))}
                         </tbody>
                    </table>
                     {registrations.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <UsersIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <p className="text-lg font-semibold">No Registrations Yet</p>
                            <p className="text-sm">No one has registered for this event.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default EventRegistrationsPage;