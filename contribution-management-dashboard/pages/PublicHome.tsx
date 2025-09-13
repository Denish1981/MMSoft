import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CameraIcon } from '../components/icons/CameraIcon';
import { API_URL } from '../config';
import { formatUTCDate } from '../utils/formatting';
import { CloseIcon } from '../components/icons/CloseIcon';
import type { RegistrationFormField } from '../types';

interface PublicEvent {
    id: number;
    name: string;
    description: string;
    eventDate: string;
    startTime: string;
    endTime: string | null;
    venue: string;
    registrationFormSchema: RegistrationFormField[];
}

const RegistrationModal: React.FC<{ event: PublicEvent; onClose: () => void }> = ({ event, onClose }) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleInputChange = (name: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/public/events/${event.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed. Please try again.');
            }
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderField = (field: RegistrationFormField) => {
        switch (field.type) {
            case 'textarea':
                return <textarea id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style" rows={3}></textarea>;
            case 'select':
                return (
                    <select id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style bg-white">
                        <option value="" disabled>Select an option</option>
                        {field.options?.split(',').map(opt => <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>)}
                    </select>
                );
            case 'checkbox':
                return (
                    <label className="flex items-center space-x-2 mt-2">
                        <input type="checkbox" id={field.name} checked={!!formData[field.name]} onChange={e => handleInputChange(field.name, e.target.checked)} required={field.required} className="h-4 w-4 text-blue-600 border-slate-300 rounded" />
                        <span className="text-sm text-slate-600">{field.label} {field.required && '*'}</span>
                    </label>
                );
            default:
                return <input type={field.type} id={field.name} value={formData[field.name] || ''} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className="mt-1 block w-full input-style" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Register for {event.name}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </div>

                {isSuccess ? (
                    <div className="p-8 text-center">
                        <h3 className="text-2xl font-bold text-green-600">Registration Confirmed!</h3>
                        <p className="mt-2 text-slate-600">Thank you for registering. We look forward to seeing you at the event.</p>
                        <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {(event.registrationFormSchema || []).map(field => (
                            <div key={field.name}>
                                {field.type !== 'checkbox' && (
                                    <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">{field.label} {field.required && '*'}</label>
                                )}
                                {renderField(field)}
                            </div>
                        ))}

                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="pt-2">
                            <button type="submit" disabled={isLoading} className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-slate-400">
                                {isLoading ? 'Submitting...' : 'Submit Registration'}
                            </button>
                        </div>
                    </form>
                )}
                 <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: PublicEvent; onRegisterClick: (event: PublicEvent) => void }> = ({ event, onRegisterClick }) => {
    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-800">{event.name}</h3>
                <div className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>🗓️ {formatUTCDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {event.startTime && <span>⏰ {formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">📍 {event.venue}</p>
                <p className="mt-4 text-sm text-slate-500 flex-grow">{event.description}</p>
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => onRegisterClick(event)}
                        className="inline-block w-full text-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                    >
                        Register Now
                    </button>
                </div>
            </div>
        </div>
    );
};

const PublicHomePage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`${API_URL}/public/events`);
                if (response.ok) {
                    const data = await response.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error("Failed to fetch public events:", error);
            } finally {
                setIsLoadingEvents(false);
            }
        };
        fetchEvents();
    }, []);

    const handleRegisterClick = (event: PublicEvent) => {
        setSelectedEvent(event);
    };

    const handleCloseModal = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="text-2xl font-bold text-slate-800 tracking-wider">Contribution OS</Link>
                        <div className="hidden md:flex items-center space-x-6">
                            <Link to="/" className="text-base font-medium text-blue-600 border-b-2 border-blue-600 pb-1">Home</Link>
                            <Link to="/photos" className="text-base font-medium text-slate-600 hover:text-blue-600">Photo Albums</Link>
                        </div>
                    </div>
                    <Link
                        to={isAuthenticated ? "/dashboard" : "/login"}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>
            <main className="container mx-auto px-6 py-12">
                <section className="text-center">
                    <h2 className="text-5xl font-extrabold text-slate-900">Welcome to Contribution OS</h2>
                    <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
                        An intelligent dashboard for managing, tracking, and analyzing charitable contributions for our community events.
                    </p>
                    <div className="mt-10">
                        <Link
                            to="/photos"
                            className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 text-lg rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
                        >
                            <CameraIcon className="w-6 h-6 mr-3" />
                            Explore Our Photo Albums
                        </Link>
                    </div>
                </section>

                <section className="mt-20">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-slate-900">Upcoming Events</h2>
                        <p className="mt-4 text-lg text-slate-600">Join us for our next community gathering.</p>
                    </div>
                    {isLoadingEvents ? (
                        <p className="text-center text-slate-500">Loading events...</p>
                    ) : events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} onRegisterClick={handleRegisterClick} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-8">No upcoming events scheduled at this time. Please check back soon!</p>
                    )}
                </section>
            </main>
             <footer className="text-center py-6 text-sm text-slate-400 mt-12">
                © {new Date().getFullYear()} Contribution OS. All rights reserved.
            </footer>
            {selectedEvent && (
                <RegistrationModal event={selectedEvent} onClose={handleCloseModal} />
            )}
        </div>
    );
};

export default PublicHomePage;