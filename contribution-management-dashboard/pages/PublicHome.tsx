import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import type { Festival as PublicFestival } from '../types/index';
import { RegistrationModal } from '../components/RegistrationModal';
import type { PublicEvent } from '../components/RegistrationModal';
import { EventCard } from '../components/EventCard';
import { StallFestivalCard } from '../components/StallFestivalCard';

const PublicHomePage: React.FC = () => {
    const { isAuthenticated, hasPermission } = useAuth();
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [stallFestivals, setStallFestivals] = useState<PublicFestival[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const [eventsRes, festivalsRes] = await Promise.all([
                    fetch(`${API_URL}/public/events`),
                    fetch(`${API_URL}/public/festivals`)
                ]);
                if (eventsRes.ok) setEvents(await eventsRes.json());
                if (festivalsRes.ok) setStallFestivals(await festivalsRes.json());
            } catch (error) {
                console.error("Failed to fetch public data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPublicData();
    }, []);

    const handleEventRegisterClick = (event: PublicEvent) => setSelectedEvent(event);
    const handleCloseModal = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="text-2xl font-bold text-slate-800 tracking-wider">Gold Towers Mitra Mandal</Link>
                        <div className="hidden md:flex items-center space-x-6">
                            <Link to="/photos" className="text-base font-medium text-slate-600 hover:text-blue-600">Photo Albums</Link>
                        </div>
                    </div>
                    <Link
                        to={dashboardTarget}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>
            <main className="container mx-auto px-6 py-12 space-y-20">

                 {stallFestivals.length > 0 && (
                    <section>
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-extrabold text-slate-900">Stall Registrations</h2>
                            <p className="mt-4 text-lg text-slate-600">Register for a stall at our upcoming festivals.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {stallFestivals.map((festival) => (
                                <StallFestivalCard key={festival.id} festival={festival} />
                            ))}
                        </div>
                    </section>
                )}


                <section>
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-slate-900">Upcoming Events</h2>
                        <p className="mt-4 text-lg text-slate-600">Join us for our next community gathering.</p>
                    </div>
                    {isLoading ? (
                        <p className="text-center text-slate-500">Loading events...</p>
                    ) : events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} onRegisterClick={handleEventRegisterClick} />
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
