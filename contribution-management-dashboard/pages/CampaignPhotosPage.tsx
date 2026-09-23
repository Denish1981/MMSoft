import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    Calendar, ArrowLeft, Image as ImageIcon, Video as VideoIcon, Play, Folder, ChevronLeft, ChevronRight, 
    X, Sparkles, AlertCircle 
} from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { getThumbnailImageUrl, getOptimizedImageUrl, isVideoUrl } from '../utils/imageUtils';
import { formatUTCDate } from '../utils/formatting';

interface PhotoItem {
    id: number;
    url: string;
    publicId?: string | null;
    folder?: string | null;
    mediaType?: string | null;
    uploadedBy?: string | null;
    createdAt?: string;
}

interface FestivalWithPhotos {
    id: number;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    photos: PhotoItem[];
}

interface CampaignDetails {
    id: number;
    name: string;
    financialYear?: string;
    description?: string;
    isActive?: boolean;
}

interface CampaignAlbumResponse {
    campaign: CampaignDetails;
    festivals: FestivalWithPhotos[];
}

interface ActiveLightboxState {
    festivalIndex: number;
    photoIndex: number;
}

export const CampaignPhotosPage: React.FC = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const { isAuthenticated, hasPermission } = useAuth();

    const [data, setData] = useState<CampaignAlbumResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [selectedFestivalFilter, setSelectedFestivalFilter] = useState<number | 'all'>('all');
    const [lightbox, setLightbox] = useState<ActiveLightboxState | null>(null);

    const dashboardTarget = isAuthenticated
        ? (hasPermission('page:dashboard:view') ? "/dashboard" : "/donor-portal")
        : "/login";

    useEffect(() => {
        let isMounted = true;
        const fetchCampaignAlbum = async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await fetch(`${API_URL}/public/campaign-albums/${campaignId}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error('Campaign not found or has been removed.');
                    }
                    throw new Error('Failed to load campaign photos.');
                }
                const result: CampaignAlbumResponse = await res.json();
                if (isMounted) {
                    setData(result);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load campaign albums');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        if (campaignId) {
            fetchCampaignAlbum();
        }
        return () => {
            isMounted = false;
        };
    }, [campaignId]);

    // Flatten all photos for easy global index traversal if needed, or per festival
    const currentFestival = useMemo(() => {
        if (!data || !lightbox) return null;
        return data.festivals[lightbox.festivalIndex] || null;
    }, [data, lightbox]);

    const currentPhoto = useMemo(() => {
        if (!currentFestival || !lightbox) return null;
        return currentFestival.photos[lightbox.photoIndex] || null;
    }, [currentFestival, lightbox]);

    // Lightbox navigation
    const handleNext = useCallback(() => {
        if (!data || !lightbox) return;
        const fest = data.festivals[lightbox.festivalIndex];
        if (!fest) return;

        if (lightbox.photoIndex < fest.photos.length - 1) {
            setLightbox({
                festivalIndex: lightbox.festivalIndex,
                photoIndex: lightbox.photoIndex + 1,
            });
        } else if (lightbox.festivalIndex < data.festivals.length - 1) {
            // Jump to next festival's first photo
            setLightbox({
                festivalIndex: lightbox.festivalIndex + 1,
                photoIndex: 0,
            });
        } else {
            // Loop to very beginning
            setLightbox({
                festivalIndex: 0,
                photoIndex: 0,
            });
        }
    }, [data, lightbox]);

    const handlePrev = useCallback(() => {
        if (!data || !lightbox) return;
        if (lightbox.photoIndex > 0) {
            setLightbox({
                festivalIndex: lightbox.festivalIndex,
                photoIndex: lightbox.photoIndex - 1,
            });
        } else if (lightbox.festivalIndex > 0) {
            // Jump to previous festival's last photo
            const prevFest = data.festivals[lightbox.festivalIndex - 1];
            setLightbox({
                festivalIndex: lightbox.festivalIndex - 1,
                photoIndex: Math.max(0, prevFest.photos.length - 1),
            });
        } else {
            // Loop to very last photo of last festival
            const lastFestIndex = data.festivals.length - 1;
            const lastFest = data.festivals[lastFestIndex];
            setLightbox({
                festivalIndex: lastFestIndex,
                photoIndex: Math.max(0, (lastFest?.photos.length || 1) - 1),
            });
        }
    }, [data, lightbox]);

    // Keyboard controls for lightbox
    useEffect(() => {
        if (!lightbox) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightbox(null);
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightbox, handleNext, handlePrev]);

    // Total photo count
    const totalPhotosCount = useMemo(() => {
        if (!data?.festivals) return 0;
        return data.festivals.reduce((sum, f) => sum + (f.photos?.length || 0), 0);
    }, [data]);

    // Filtered festivals list based on festival tab
    const visibleFestivals = useMemo(() => {
        if (!data?.festivals) return [];
        if (selectedFestivalFilter === 'all') return data.festivals;
        return data.festivals.filter(f => f.id === selectedFestivalFilter);
    }, [data, selectedFestivalFilter]);

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col justify-between">
            {/* Header */}
            <header className="bg-white shadow-xs border-b border-slate-200 sticky top-0 z-30">
                <nav className="container mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
                    <div className="flex items-center space-x-4 sm:space-x-6">
                        <Link 
                            to="/photos" 
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Campaigns</span>
                        </Link>
                        <span className="hidden sm:inline-block text-slate-300">|</span>
                        <Link to="/" className="hidden sm:inline-block text-base font-bold text-slate-800 tracking-wide hover:text-blue-600 transition-colors">
                            GTMM Trust
                        </Link>
                    </div>

                    <Link
                        to={dashboardTarget}
                        className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg shadow-xs hover:bg-blue-700 transition-all"
                    >
                        {isAuthenticated ? "Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow space-y-8 max-w-7xl">
                {isLoading && (
                    <div className="py-24 text-center space-y-4">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
                        <p className="text-slate-500 text-sm font-medium">Loading campaign festival photographs...</p>
                    </div>
                )}

                {error && (
                    <div className="max-w-lg mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                        <h3 className="text-lg font-bold text-red-900">{error}</h3>
                        <Link 
                            to="/photos" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Return to All Campaigns
                        </Link>
                    </div>
                )}

                {!isLoading && !error && data && (
                    <>
                        {/* Campaign Banner & Overview */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 md:p-10 relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {data.campaign.financialYear && (
                                        <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
                                            {data.campaign.financialYear}
                                        </span>
                                    )}
                                    {data.campaign.isActive && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                                            <Sparkles className="w-3 h-3 text-emerald-600" /> Active Campaign
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                                    {data.campaign.name}
                                </h1>

                                {data.campaign.description && (
                                    <p className="text-slate-600 text-sm sm:text-base max-w-3xl leading-relaxed">
                                        {data.campaign.description}
                                    </p>
                                )}

                                {/* Summary Statistics */}
                                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-slate-600">
                                    <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>{data.festivals.length} {data.festivals.length === 1 ? 'Festival' : 'Festivals'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
                                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                                        <span>{totalPhotosCount} {totalPhotosCount === 1 ? 'Photograph' : 'Photographs'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Festival Tabs / Filters (If more than 1 festival) */}
                        {data.festivals.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFestivalFilter('all')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                                        selectedFestivalFilter === 'all'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    All Festivals ({totalPhotosCount})
                                </button>
                                {data.festivals.map((fest) => (
                                    <button
                                        key={fest.id}
                                        type="button"
                                        onClick={() => setSelectedFestivalFilter(fest.id)}
                                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                                            selectedFestivalFilter === fest.id
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {fest.name} ({fest.photos.length})
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Festivals & Photographs */}
                        {visibleFestivals.length === 0 || totalPhotosCount === 0 ? (
                            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                                <h3 className="text-lg font-bold text-slate-800">No Festival Photographs Yet</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto">
                                    No photos have been uploaded for the festivals in this campaign yet. Check back soon for event highlights and celebrations.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {visibleFestivals.map((festival, fIndex) => {
                                    const actualFestIndex = data.festivals.findIndex(f => f.id === festival.id);

                                    return (
                                        <section 
                                            key={festival.id} 
                                            id={`festival-${festival.id}`} 
                                            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
                                        >
                                            {/* Festival Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                                            {festival.name}
                                                        </h2>
                                                    </div>
                                                    <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                        <span>
                                                            {formatUTCDate(festival.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            {' — '}
                                                            {formatUTCDate(festival.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </p>
                                                    {festival.description && (
                                                        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl">
                                                            {festival.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl self-start sm:self-center border border-blue-100">
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    {festival.photos.length} {festival.photos.length === 1 ? 'Photo' : 'Photos'}
                                                </span>
                                            </div>

                                            {/* Photos Grid for this festival */}
                                            {festival.photos.length === 0 ? (
                                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                                                    No photos uploaded for this festival yet.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                                    {festival.photos.map((photo, pIndex) => {
                                                        const isVid = photo.mediaType === 'video' || isVideoUrl(photo.url);
                                                        return (
                                                            <div
                                                                key={photo.id || pIndex}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => setLightbox({ festivalIndex: actualFestIndex, photoIndex: pIndex })}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        setLightbox({ festivalIndex: actualFestIndex, photoIndex: pIndex });
                                                                    }
                                                                }}
                                                                className="aspect-square bg-slate-100 rounded-2xl overflow-hidden cursor-pointer group relative border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-300"
                                                            >
                                                                {isVid ? (
                                                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                                                                        <video 
                                                                            src={photo.url} 
                                                                            preload="metadata" 
                                                                            className="w-full h-full object-cover opacity-75"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                                                                <Play className="w-5 h-5 fill-white ml-0.5" />
                                                                            </div>
                                                                        </div>
                                                                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                                                            <VideoIcon className="w-2.5 h-2.5" />
                                                                            Video
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <img
                                                                        src={getThumbnailImageUrl(photo.url, 450, 450)}
                                                                        alt={`${festival.name} celebration photo ${pIndex + 1}`}
                                                                        loading="lazy"
                                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                )}

                                                                {/* Folder Badge */}
                                                                {photo.folder && photo.folder !== 'General' && (
                                                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded font-medium flex items-center gap-1 z-5">
                                                                        <Folder className="w-2.5 h-2.5 text-amber-300" />
                                                                        {photo.folder}
                                                                    </div>
                                                                )}

                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2.5">
                                                                    <span className="text-[11px] font-semibold text-white truncate">
                                                                        {photo.folder ? `${photo.folder} • ` : ''}{isVid ? 'Video' : 'Photo'} #{pIndex + 1}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Lightbox / Fullscreen Image Viewer Modal */}
            {lightbox && currentFestival && currentPhoto && (
                <div 
                    role="dialog" 
                    aria-modal="true"
                    aria-label="Image viewer"
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xs flex items-center justify-center select-none"
                    onClick={() => setLightbox(null)}
                >
                    {/* Top Bar with Festival Info & Close Button */}
                    <div 
                        className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/70 to-transparent"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                {currentFestival.name}
                            </h4>
                            <p className="text-xs text-slate-300">
                                Photo {lightbox.photoIndex + 1} of {currentFestival.photos.length}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLightbox(null)}
                            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                            title="Close viewer (Esc)"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="absolute left-3 sm:left-6 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer shadow-lg"
                        title="Previous Photo (Left Arrow)"
                    >
                        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>

                    {/* Next Button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-3 sm:right-6 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer shadow-lg"
                        title="Next Photo (Right Arrow)"
                    >
                        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>

                    {/* Active Media */}
                    <div 
                        className="p-4 max-h-[88vh] max-w-[92vw] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {currentPhoto.mediaType === 'video' || isVideoUrl(currentPhoto.url) ? (
                            <video 
                                src={currentPhoto.url} 
                                controls 
                                autoPlay 
                                className="max-h-[85vh] max-w-[88vw] rounded-xl shadow-2xl animate-in fade-in duration-200" 
                            />
                        ) : (
                            <img
                                src={getOptimizedImageUrl(currentPhoto.url, 'f_auto,q_auto')}
                                alt={`${currentFestival.name} photo ${lightbox.photoIndex + 1}`}
                                className="max-h-[85vh] max-w-[88vw] object-contain rounded-xl shadow-2xl animate-in fade-in duration-200"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="text-center py-6 text-sm text-slate-400 border-t border-slate-200 bg-white">
                © {new Date().getFullYear()} GTMM Trust. All rights reserved.
            </footer>
        </div>
    );
};

export default CampaignPhotosPage;
