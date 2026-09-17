import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Image as ImageIcon, ArrowRight, Sparkles } from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { getThumbnailImageUrl } from '../utils/imageUtils';

interface CampaignAlbum {
    id: number;
    name: string;
    financialYear?: string;
    description?: string;
    isActive?: boolean;
    festivalCount: number;
    photoCount: number;
    coverImage: string | null;
}

const PhotoAlbumsListPage: React.FC = () => {
    const [campaigns, setCampaigns] = useState<CampaignAlbum[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAuthenticated, hasPermission } = useAuth();

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    useEffect(() => {
        const fetchCampaignAlbums = async () => {
            try {
                const response = await fetch(`${API_URL}/public/campaign-albums`);
                if (!response.ok) {
                    throw new Error('Failed to fetch campaign albums');
                }
                const data = await response.json();
                setCampaigns(data);
            } catch (error) {
                console.error('Error fetching campaign albums:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCampaignAlbums();
    }, []);

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            <header className="bg-white shadow-xs border-b border-slate-200 sticky top-0 z-30">
                <nav className="container mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <Link to="/" className="text-xl sm:text-2xl font-bold text-slate-800 tracking-wide hover:text-blue-600 transition-colors">
                            GTMM Trust
                        </Link>
                        <div className="hidden md:flex items-center space-x-6">
                            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                                Home
                            </Link>
                            <Link to="/photos" className="text-sm font-bold text-blue-600 border-b-2 border-blue-600 pb-1">
                                Photo Albums
                            </Link>
                        </div>
                    </div>
                    <Link
                        to={dashboardTarget}
                        className="px-5 py-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs hover:bg-blue-700 transition-all"
                    >
                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>

            <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow max-w-7xl">
                <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-3">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 tracking-wide uppercase">
                        Festival Photo Gallery
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Campaign Photo Albums
                    </h1>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        Select a campaign below to view photo galleries of its celebrations and festivals.
                    </p>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center space-y-3">
                        <div className="inline-block animate-spin rounded-full h-9 w-9 border-4 border-blue-500 border-t-transparent" />
                        <p className="text-slate-500 text-sm font-medium">Loading campaign albums...</p>
                    </div>
                ) : campaigns.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {campaigns.map(campaign => (
                            <Link 
                                to={`/photos/campaign/${campaign.id}`} 
                                key={campaign.id} 
                                className="group flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                {/* Cover Image */}
                                <div className="relative h-56 bg-slate-100 overflow-hidden">
                                    {campaign.coverImage ? (
                                        <img
                                            src={getThumbnailImageUrl(campaign.coverImage, 600, 400)}
                                            alt={campaign.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50 flex flex-col items-center justify-center p-6 text-center">
                                            <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                                            <span className="text-xs font-semibold text-slate-400">No Photos Yet</span>
                                        </div>
                                    )}

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                    {/* Badges on image */}
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                                        {campaign.financialYear && (
                                            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-xs text-slate-800 text-xs font-bold rounded-lg shadow-2xs">
                                                {campaign.financialYear}
                                            </span>
                                        )}
                                        {campaign.isActive && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-2xs">
                                                <Sparkles className="w-3 h-3" /> Active
                                            </span>
                                        )}
                                    </div>

                                    {/* Photo and festival counters overlay */}
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-xs text-white/90 font-medium">
                                        <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {campaign.festivalCount} {campaign.festivalCount === 1 ? 'Festival' : 'Festivals'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-md">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            {campaign.photoCount} {campaign.photoCount === 1 ? 'Photo' : 'Photos'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-5 sm:p-6 flex-grow flex flex-col justify-between space-y-4">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {campaign.name}
                                        </h2>
                                        {campaign.description && (
                                            <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                                                {campaign.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Card Footer Action */}
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-xs sm:text-sm group-hover:text-blue-700">
                                        <span>View Festival Photos</span>
                                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 max-w-md mx-auto">
                        <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-800">No Photo Albums Found</h3>
                        <p className="text-xs sm:text-sm text-slate-500">
                            There are currently no campaign albums with festival photographs available.
                        </p>
                    </div>
                )}
            </main>

            <footer className="text-center py-6 text-sm text-slate-400 border-t border-slate-200 bg-white">
                © {new Date().getFullYear()} GTMM Trust. All rights reserved.
            </footer>
        </div>
    );
};

export default PhotoAlbumsListPage;

