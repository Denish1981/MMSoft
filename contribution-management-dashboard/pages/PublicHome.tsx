import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CameraIcon } from '../components/icons/CameraIcon';
import { API_URL } from '../config';
import { formatUTCDate } from '../utils/formatting';
import { CloseIcon } from '../components/icons/CloseIcon';

interface PublicEvent {
    name: string;
    description: string;
    eventDate: string;
    startTime: string;
    endTime: string | null;
    venue: string;
    registrationLink: string | null;
}

const RegistrationModal: React.FC<{ registrationLink: string; onClose: () => void }> = ({ registrationLink, onClose }) => {
    // Google forms can be embedded by appending `?embedded=true` to the URL.
    const embedUrl = registrationLink.includes('?') 
        ? `${registrationLink}&embedded=true` 
        : `${registrationLink}?embedded=true`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Event Registration</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-grow overflow-hidden">
                    <iframe
                        src={embedUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        marginHeight={0}
                        marginWidth={0}
                        title="Event Registration Form"
                    >
                        Loading…
                    </iframe>
                </div>
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: PublicEvent; onRegisterClick: (link: string) => void }> = ({ event, onRegisterClick }) => {
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
                 {event.registrationLink && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <button 
                            onClick={() => onRegisterClick(event.registrationLink!)}
                            className="inline-block w-full text-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                        >
                            Register Now
                        </button>
                    </div>
                 )}
            </div>
        </div>
    );
};

const PublicHomePage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [registrationModalLink, setRegistrationModalLink] = useState<string | null>(null);

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

    const handleRegisterClick = (link: string) => {
        setRegistrationModalLink(link);
    };

    const handleCloseModal = () => {
        setRegistrationModalLink(null);
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
                            {events.map((event, index) => (
                                <EventCard key={index} event={event} onRegisterClick={handleRegisterClick} />
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
            {registrationModalLink && (
                <RegistrationModal registrationLink={registrationModalLink} onClose={handleCloseModal} />
            )}
        </div>
    );
};

export default PublicHomePage;