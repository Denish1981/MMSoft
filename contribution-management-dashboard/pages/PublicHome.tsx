import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicHomePage: React.FC = () => {
    const { isAuthenticated, hasPermission } = useAuth();

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="text-2xl font-bold text-slate-800 tracking-wider">
                            Gold Towers Mitra Mandal
                        </Link>
                        <div className="hidden md:flex items-center space-x-6">
                            <Link to="/photos" className="text-base font-medium text-slate-600 hover:text-blue-600 transition-colors">
                                Photo Albums
                            </Link>
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

            <main className="container mx-auto px-6 py-16 flex-grow flex flex-col items-center justify-center text-center">
                <div className="max-w-3xl mx-auto space-y-6">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Welcome to Gold Towers Mitra Mandal
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                        Celebrating community spirit, festivals, and togetherness. Explore our photo albums or log in to access member services.
                    </p>
                    <div className="pt-4 flex flex-wrap justify-center gap-4">
                        <Link
                            to="/photos"
                            className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl shadow-md hover:bg-slate-900 transition-colors"
                        >
                            View Photo Albums
                        </Link>
                        <Link
                            to={dashboardTarget}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                        >
                            {isAuthenticated ? "Go to Dashboard" : "Member Login"}
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="text-center py-6 text-sm text-slate-400">
                © {new Date().getFullYear()} GTMM Trust. All rights reserved.
            </footer>
        </div>
    );
};

export default PublicHomePage;

