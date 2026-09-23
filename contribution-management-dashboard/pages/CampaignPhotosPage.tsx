import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    Calendar, ArrowLeft, Image as ImageIcon, Video as VideoIcon, Play, Folder, ChevronLeft, ChevronRight, 
    X, Sparkles, AlertCircle, Layers, Filter, Check
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

interface PhotoWithContext extends PhotoItem {
    festivalId: number;
    festivalName: string;
    festivalStartDate: string;
    festivalEndDate: string;
}

interface ActiveLightboxState {
    photoList: PhotoWithContext[];
    currentIndex: number;
}

export const CampaignPhotosPage: React.FC = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const { isAuthenticated, hasPermission } = useAuth();

    const [data, setData] = useState<CampaignAlbumResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    
    // View organization state: Default to 'folder' view so photographs are displayed by folder!
    const [viewMode, setViewMode] = useState<'folder' | 'festival'>('folder');
    const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
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

    // Flatten all photos with festival context
    const allPhotosWithContext = useMemo<PhotoWithContext[]>(() => {
        if (!data?.festivals) return [];
        const list: PhotoWithContext[] = [];
        data.festivals.forEach(fest => {
            (fest.photos || []).forEach(p => {
                list.push({
                    ...p,
                    folder: (p.folder && p.folder.trim()) ? p.folder.trim() : 'General',
                    festivalId: fest.id,
                    festivalName: fest.name,
                    festivalStartDate: fest.startDate,
                    festivalEndDate: fest.endDate
                });
            });
        });
        return list;
    }, [data]);

    // Compute distinct folders and photos grouped by folder
    const { allFolders, folderCounts, photosGroupedByFolder, filteredFolderList } = useMemo(() => {
        const counts: Record<string, number> = {};
        const grouped: Record<string, PhotoWithContext[]> = {};
        
        allPhotosWithContext.forEach(p => {
            const f = p.folder || 'General';
            counts[f] = (counts[f] || 0) + 1;
            if (!grouped[f]) grouped[f] = [];
            grouped[f].push(p);
        });

        const sortedFolders = Object.keys(counts).sort((a, b) => {
            if (a === 'General') return 1;
            if (b === 'General') return -1;
            return a.localeCompare(b);
        });

        // Filtered by selectedFolderFilter
        let folderKeys = sortedFolders;
        if (selectedFolderFilter !== 'all') {
            folderKeys = sortedFolders.filter(f => f === selectedFolderFilter);
        }

        return {
            allFolders: sortedFolders,
            folderCounts: counts,
            photosGroupedByFolder: grouped,
            filteredFolderList: folderKeys
        };
    }, [allPhotosWithContext, selectedFolderFilter]);

    // Total photo count
    const totalPhotosCount = allPhotosWithContext.length;

    // Filtered festivals list based on festival tab
    const visibleFestivals = useMemo(() => {
        if (!data?.festivals) return [];
        let list = data.festivals;
        if (selectedFestivalFilter !== 'all') {
            list = list.filter(f => f.id === selectedFestivalFilter);
        }
        return list;
    }, [data, selectedFestivalFilter]);

    // Lightbox navigation
    const currentLightboxPhoto = useMemo(() => {
        if (!lightbox || !lightbox.photoList || lightbox.photoList.length === 0) return null;
        return lightbox.photoList[lightbox.currentIndex] || null;
    }, [lightbox]);

    const handleNext = useCallback(() => {
        if (!lightbox || lightbox.photoList.length <= 1) return;
        setLightbox(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentIndex: (prev.currentIndex + 1) % prev.photoList.length
            };
        });
    }, [lightbox]);

    const handlePrev = useCallback(() => {
        if (!lightbox || lightbox.photoList.length <= 1) return;
        setLightbox(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentIndex: (prev.currentIndex - 1 + prev.photoList.length) % prev.photoList.length
            };
        });
    }, [lightbox]);

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

    const openLightbox = (photoList: PhotoWithContext[], index: number) => {
        setLightbox({
            photoList,
            currentIndex: index
        });
    };

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
                        <p className="text-slate-500 text-sm font-medium">Loading campaign photographs by folder...</p>
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
                                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-slate-600">
                                    <div className="flex items-center gap-2 bg-amber-50 text-amber-900 px-3.5 py-1.5 rounded-xl border border-amber-200">
                                        <Folder className="w-4 h-4 text-amber-600" />
                                        <span>{allFolders.length} {allFolders.length === 1 ? 'Folder' : 'Folders'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-900 px-3.5 py-1.5 rounded-xl border border-indigo-200">
                                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                                        <span>{totalPhotosCount} {totalPhotosCount === 1 ? 'Photograph' : 'Photographs'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-50 text-blue-900 px-3.5 py-1.5 rounded-xl border border-blue-200">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>{data.festivals.length} {data.festivals.length === 1 ? 'Festival' : 'Festivals'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Bar: View Mode Switcher and Folder / Festival Controls */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Folder className="w-5 h-5 text-amber-500" />
                                        <span>Browse Photographs</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {viewMode === 'folder' 
                                            ? 'Viewing photographs organized based on folder categories.' 
                                            : 'Viewing photographs organized by festival with folder filters.'}
                                    </p>
                                </div>

                                {/* View Mode Toggle */}
                                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('folder')}
                                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                                            viewMode === 'folder' 
                                                ? 'bg-blue-600 text-white shadow-xs' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Folder className="w-3.5 h-3.5" />
                                        <span>By Folder</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('festival')}
                                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                                            viewMode === 'festival' 
                                                ? 'bg-blue-600 text-white shadow-xs' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>By Festival</span>
                                    </button>
                                </div>
                            </div>

                            {/* Folder Tabs Filter Bar (When in Folder Mode or always available) */}
                            {allFolders.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                                            Filter by Folder:
                                        </span>
                                        {selectedFolderFilter !== 'all' && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedFolderFilter('all')}
                                                className="text-blue-600 hover:underline cursor-pointer"
                                            >
                                                Show all folders ({allFolders.length})
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFolderFilter('all')}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                                                selectedFolderFilter === 'all'
                                                    ? 'bg-slate-900 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            All Folders ({totalPhotosCount})
                                        </button>
                                        {allFolders.map(folderName => {
                                            const count = folderCounts[folderName] || 0;
                                            const isSelected = selectedFolderFilter === folderName;
                                            return (
                                                <button
                                                    key={folderName}
                                                    type="button"
                                                    onClick={() => setSelectedFolderFilter(folderName)}
                                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-amber-600 text-white shadow-xs'
                                                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-amber-300'
                                                    }`}
                                                >
                                                    <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                                                    <span>{folderName}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                        isSelected ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Festival Tabs (When in Festival Mode) */}
                            {viewMode === 'festival' && data.festivals.length > 1 && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        Select Festival:
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFestivalFilter('all')}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                                selectedFestivalFilter === 'all'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            All Festivals ({data.festivals.length})
                                        </button>
                                        {data.festivals.map(fest => (
                                            <button
                                                key={fest.id}
                                                type="button"
                                                onClick={() => setSelectedFestivalFilter(fest.id)}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                                    selectedFestivalFilter === fest.id
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {fest.name} ({fest.photos?.length || 0})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PHOTOGRAPHS DISPLAY */}
                        {totalPhotosCount === 0 ? (
                            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                                <h3 className="text-lg font-bold text-slate-800">No Photographs Available</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto">
                                    No photographs have been uploaded for this campaign yet. Check back soon for event highlights and celebrations.
                                </p>
                            </div>
                        ) : viewMode === 'folder' ? (
                            /* ================= FOLDER VIEW (Photographs displayed based on folder) ================= */
                            <div className="space-y-8">
                                {filteredFolderList.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                                        <Folder className="w-10 h-10 text-slate-300 mx-auto" />
                                        <h4 className="text-base font-bold text-slate-700">No photos in selected folder</h4>
                                        <button 
                                            onClick={() => setSelectedFolderFilter('all')}
                                            className="text-xs font-semibold text-blue-600 hover:underline"
                                        >
                                            View all folders
                                        </button>
                                    </div>
                                ) : (
                                    filteredFolderList.map(folderName => {
                                        const folderPhotos = photosGroupedByFolder[folderName] || [];
                                        if (folderPhotos.length === 0) return null;

                                        // Distinct festivals for this folder
                                        const festNames = Array.from(new Set(folderPhotos.map(p => p.festivalName)));

                                        return (
                                            <section 
                                                key={folderName}
                                                id={`folder-${folderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
                                            >
                                                {/* Folder Section Header */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                                                    <div>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                                                                <Folder className="w-5 h-5 fill-amber-500 text-amber-600" />
                                                            </div>
                                                            <div>
                                                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                                                                    <span>{folderName}</span>
                                                                </h2>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    <span className="text-xs text-slate-500 font-medium">
                                                                        From {festNames.length} {festNames.length === 1 ? 'festival' : 'festivals'}:
                                                                    </span>
                                                                    {festNames.map(fName => (
                                                                        <span key={fName} className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                                                            {fName}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                                        {selectedFolderFilter === 'all' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedFolderFilter(folderName)}
                                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer"
                                                            >
                                                                View Only
                                                            </button>
                                                        )}
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
                                                            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                                                            {folderPhotos.length} {folderPhotos.length === 1 ? 'Item' : 'Items'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Photographs Grid for this folder */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                                    {folderPhotos.map((photo, pIndex) => {
                                                        const isVid = photo.mediaType === 'video' || isVideoUrl(photo.url);
                                                        return (
                                                            <div
                                                                key={photo.id || pIndex}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => openLightbox(folderPhotos, pIndex)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        openLightbox(folderPhotos, pIndex);
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
                                                                        alt={`${folderName} photo ${pIndex + 1}`}
                                                                        loading="lazy"
                                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                )}

                                                                {/* Festival Badge on thumbnail */}
                                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded font-medium flex items-center gap-1 z-5 max-w-[85%] truncate">
                                                                    <Calendar className="w-2.5 h-2.5 text-blue-300 shrink-0" />
                                                                    <span className="truncate">{photo.festivalName}</span>
                                                                </div>

                                                                {/* Hover Overlay */}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2.5">
                                                                    <span className="text-[11px] font-semibold text-white truncate">
                                                                        {photo.festivalName} • #{pIndex + 1}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            /* ================= FESTIVAL VIEW (With Folder filter support) ================= */
                            <div className="space-y-12">
                                {visibleFestivals.map(festival => {
                                    // Filter festival photos by selected folder if any
                                    const festivalPhotos = (festival.photos || [])
                                        .map(p => ({
                                            ...p,
                                            folder: (p.folder && p.folder.trim()) ? p.folder.trim() : 'General',
                                            festivalId: festival.id,
                                            festivalName: festival.name,
                                            festivalStartDate: festival.startDate,
                                            festivalEndDate: festival.endDate
                                        }))
                                        .filter(p => selectedFolderFilter === 'all' || p.folder === selectedFolderFilter);

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

                                                <div className="flex items-center gap-2 self-start sm:self-center">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100">
                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                        {festivalPhotos.length} {festivalPhotos.length === 1 ? 'Photo' : 'Photos'}
                                                        {selectedFolderFilter !== 'all' && ` (in ${selectedFolderFilter})`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Photos Grid for this festival */}
                                            {festivalPhotos.length === 0 ? (
                                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                                                    {selectedFolderFilter !== 'all' 
                                                        ? `No photos found in folder "${selectedFolderFilter}" for this festival.`
                                                        : 'No photos uploaded for this festival yet.'}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                                                    {festivalPhotos.map((photo, pIndex) => {
                                                        const isVid = photo.mediaType === 'video' || isVideoUrl(photo.url);
                                                        return (
                                                            <div
                                                                key={photo.id || pIndex}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => openLightbox(festivalPhotos, pIndex)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        openLightbox(festivalPhotos, pIndex);
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
                                                                        alt={`${festival.name} photo ${pIndex + 1}`}
                                                                        loading="lazy"
                                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                )}

                                                                {/* Folder Badge */}
                                                                {photo.folder && (
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
            {lightbox && currentLightboxPhoto && (
                <div 
                    role="dialog" 
                    aria-modal="true"
                    aria-label="Image viewer"
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xs flex items-center justify-center select-none"
                    onClick={() => setLightbox(null)}
                >
                    {/* Top Bar with Folder & Festival Info, Counter, and Close Button */}
                    <div 
                        className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/80 to-transparent"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            {/* Folder Chip in Viewer */}
                            {currentLightboxPhoto.folder && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                                    {currentLightboxPhoto.folder}
                                </span>
                            )}
                            <div>
                                <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                    {currentLightboxPhoto.festivalName}
                                </h4>
                                <p className="text-xs text-slate-300">
                                    Item {lightbox.currentIndex + 1} of {lightbox.photoList.length}
                                </p>
                            </div>
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
                    {lightbox.photoList.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            className="absolute left-3 sm:left-6 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer shadow-lg"
                            title="Previous Photo (Left Arrow)"
                        >
                            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                        </button>
                    )}

                    {/* Next Button */}
                    {lightbox.photoList.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-3 sm:right-6 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer shadow-lg"
                            title="Next Photo (Right Arrow)"
                        >
                            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                        </button>
                    )}

                    {/* Active Media Display */}
                    <div 
                        className="p-4 max-h-[88vh] max-w-[92vw] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {currentLightboxPhoto.mediaType === 'video' || isVideoUrl(currentLightboxPhoto.url) ? (
                            <video 
                                src={currentLightboxPhoto.url} 
                                controls 
                                autoPlay 
                                className="max-h-[85vh] max-w-[88vw] rounded-xl shadow-2xl animate-in fade-in duration-200" 
                            />
                        ) : (
                            <img
                                src={getOptimizedImageUrl(currentLightboxPhoto.url, 'f_auto,q_auto')}
                                alt={`${currentLightboxPhoto.folder || 'Festival'} photo ${lightbox.currentIndex + 1}`}
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
