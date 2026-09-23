import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { 
    Folder, Image as ImageIcon, Video as VideoIcon, Play, 
    ChevronLeft, ChevronRight, X, Filter, Layers 
} from 'lucide-react';
import { API_URL } from '../config';
import { formatUTCDate } from '../utils/formatting';
import { getThumbnailImageUrl, getOptimizedImageUrl, isVideoUrl } from '../utils/imageUtils';

interface AlbumMediaItem {
    id: number;
    url: string;
    folder?: string;
    mediaType?: 'image' | 'video';
    createdAt?: string;
}

interface AlbumDetails {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    campaignId?: number;
    campaignName?: string;
    images: string[];
    photos?: AlbumMediaItem[];
}

const PhotoAlbumPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [album, setAlbum] = useState<AlbumDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // View state
    const [viewMode, setViewMode] = useState<'folder' | 'grid'>('folder');
    const [activeFolder, setActiveFolder] = useState<string>('all');
    
    // Lightbox state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerList, setViewerList] = useState<AlbumMediaItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!id) return;
        const fetchAlbum = async () => {
            try {
                const response = await fetch(`${API_URL}/public/albums/${id}`);
                if (!response.ok) {
                    throw new Error('Album not found');
                }
                const data = await response.json();
                setAlbum(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load album');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAlbum();
    }, [id]);

    // Standardize all media into a single unified list
    const mediaList: AlbumMediaItem[] = useMemo(() => {
        if (!album) return [];
        if (album.photos && album.photos.length > 0) {
            return album.photos.map(p => ({
                ...p,
                folder: p.folder && p.folder.trim() ? p.folder.trim() : 'General'
            }));
        }
        return (album.images || []).map((img, idx) => ({
            id: idx + 1,
            url: img,
            folder: 'General',
            mediaType: isVideoUrl(img) ? 'video' : 'image'
        }));
    }, [album]);

    // Distinct folders and their counts
    const folderCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        mediaList.forEach(item => {
            const f = item.folder || 'General';
            counts[f] = (counts[f] || 0) + 1;
        });
        return counts;
    }, [mediaList]);

    const distinctFolders = useMemo(() => {
        return Object.keys(folderCounts).sort((a, b) => {
            if (a === 'General') return 1;
            if (b === 'General') return -1;
            return a.localeCompare(b);
        });
    }, [folderCounts]);

    // Group media by folder
    const groupedMedia = useMemo(() => {
        const groups: Record<string, AlbumMediaItem[]> = {};
        mediaList.forEach(item => {
            const f = item.folder || 'General';
            if (!groups[f]) groups[f] = [];
            groups[f].push(item);
        });
        return groups;
    }, [mediaList]);

    // Filtered media for grid view or single folder view
    const filteredMedia = useMemo(() => {
        if (activeFolder === 'all') return mediaList;
        return mediaList.filter(item => (item.folder || 'General') === activeFolder);
    }, [mediaList, activeFolder]);

    const openViewer = (list: AlbumMediaItem[], index: number) => {
        setViewerList(list);
        setCurrentIndex(index);
        setViewerOpen(true);
    };

    const closeViewer = () => setViewerOpen(false);

    const nextItem = () => {
        if (viewerList.length > 0) {
            setCurrentIndex((prev) => (prev + 1) % viewerList.length);
        }
    };

    const prevItem = () => {
        if (viewerList.length > 0) {
            setCurrentIndex((prev) => (prev - 1 + viewerList.length) % viewerList.length);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        if (!viewerOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeViewer();
            else if (e.key === 'ArrowRight') nextItem();
            else if (e.key === 'ArrowLeft') prevItem();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewerOpen, viewerList]);

    const currentItem = viewerList[currentIndex] || null;

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-xs sticky top-0 z-20 border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Link 
                            to={album?.campaignId ? `/photos/campaign/${album.campaignId}` : "/photos"} 
                            className="text-slate-600 hover:text-blue-600 flex items-center text-sm font-semibold transition cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            {album?.campaignName ? `Back to ${album.campaignName}` : 'Back to Photo Albums'}
                        </Link>
                    </div>
                    {album && <h1 className="text-lg font-bold text-slate-800 line-clamp-1">{album.name}</h1>}
                    <div className="w-12" />
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-7xl">
                {isLoading && (
                    <div className="text-center py-20 text-slate-600">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Loading album photographs...
                    </div>
                )}
                {error && <div className="text-center text-red-500 py-16">{error}</div>}
                
                {album && (
                    <>
                        {/* Album Header Banner */}
                        <div className="text-center mb-8 max-w-3xl mx-auto space-y-2">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{album.name}</h2>
                            <p className="text-sm md:text-base font-medium text-slate-500">
                                {formatUTCDate(album.startDate, { day: 'numeric', month: 'long', year: 'numeric' })} - {formatUTCDate(album.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {album.description && (
                                <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">{album.description}</p>
                            )}

                            {/* Summary Badges */}
                            <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-200">
                                    <Folder className="w-3.5 h-3.5 text-amber-600" />
                                    {distinctFolders.length} {distinctFolders.length === 1 ? 'Folder' : 'Folders'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 rounded-full border border-blue-200">
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                                    {mediaList.length} {mediaList.length === 1 ? 'Photograph' : 'Photographs'}
                                </span>
                            </div>
                        </div>

                        {/* Controls Bar: View Toggle & Folder Filters */}
                        {mediaList.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Folder className="w-5 h-5 text-amber-500" />
                                        <span className="text-sm font-bold text-slate-800">Album Folders & Media</span>
                                    </div>

                                    {/* View Toggle */}
                                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('folder')}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                                                viewMode === 'folder'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <Folder className="w-3.5 h-3.5" />
                                            By Folder
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                                                viewMode === 'grid'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            All Photos Grid
                                        </button>
                                    </div>
                                </div>

                                {/* Folder Pills */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                                        Folder:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveFolder('all')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                            activeFolder === 'all'
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        All Folders ({mediaList.length})
                                    </button>
                                    {distinctFolders.map((folderName) => (
                                        <button
                                            key={folderName}
                                            type="button"
                                            onClick={() => setActiveFolder(folderName)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                                                activeFolder === folderName
                                                    ? 'bg-amber-600 text-white shadow-xs'
                                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Folder className={`w-3.5 h-3.5 ${activeFolder === folderName ? 'text-white' : 'text-amber-500'}`} />
                                            {folderName}
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                                activeFolder === folderName ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {folderCounts[folderName]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PHOTOGRAPHS PRESENTATION */}
                        {mediaList.length === 0 ? (
                            <div className="text-center text-slate-500 py-16 bg-white rounded-2xl border border-slate-200">
                                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                <p className="text-base font-medium">No photographs uploaded for this album yet.</p>
                            </div>
                        ) : viewMode === 'folder' ? (
                            /* ================= BY FOLDER VIEW ================= */
                            <div className="space-y-8">
                                {(activeFolder === 'all' ? distinctFolders : [activeFolder]).map(folderName => {
                                    const folderItems = groupedMedia[folderName] || [];
                                    if (folderItems.length === 0) return null;

                                    return (
                                        <section 
                                            key={folderName}
                                            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
                                        >
                                            {/* Folder Section Header */}
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200">
                                                        <Folder className="w-4 h-4 fill-amber-500 text-amber-600" />
                                                    </div>
                                                    <span>{folderName}</span>
                                                </h3>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
                                                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                                                    {folderItems.length} {folderItems.length === 1 ? 'Item' : 'Items'}
                                                </span>
                                            </div>

                                            {/* Photographs Grid for this folder */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {folderItems.map((item, index) => {
                                                    const isVid = item.mediaType === 'video' || isVideoUrl(item.url);
                                                    return (
                                                        <div 
                                                            key={item.id || index} 
                                                            className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer group relative shadow-2xs border border-slate-200/80 hover:shadow-md transition-all" 
                                                            onClick={() => openViewer(folderItems, index)}
                                                        >
                                                            {isVid ? (
                                                                <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                                                                    <video 
                                                                        src={item.url} 
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
                                                                    src={getThumbnailImageUrl(item.url, 500, 500)}
                                                                    alt={`${folderName} photo ${index + 1}`}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            )}

                                                            {/* Folder Pill */}
                                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                                                <Folder className="w-2.5 h-2.5 text-amber-300" />
                                                                {folderName}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ================= ALL PHOTOS GRID VIEW ================= */
                            filteredMedia.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {filteredMedia.map((item, index) => {
                                        const isVid = item.mediaType === 'video' || isVideoUrl(item.url);
                                        return (
                                            <div 
                                                key={item.id || index} 
                                                className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer group relative shadow-2xs border border-slate-200/80 hover:shadow-md transition-all" 
                                                onClick={() => openViewer(filteredMedia, index)}
                                            >
                                                {isVid ? (
                                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                                                        <video 
                                                            src={item.url} 
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
                                                        src={getThumbnailImageUrl(item.url, 500, 500)}
                                                        alt={`Album photo ${index + 1}`}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                )}

                                                {/* Folder Pill */}
                                                {item.folder && (
                                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                                        <Folder className="w-2.5 h-2.5 text-amber-300" />
                                                        {item.folder}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-16 bg-white rounded-2xl border border-slate-200">
                                    <p className="text-base font-medium">No media items found in this folder.</p>
                                </div>
                            )
                        )}
                    </>
                )}
            </main>
            
            {/* Viewer / Lightbox modal */}
            {viewerOpen && currentItem && (
                <div 
                    className="fixed inset-0 bg-black/90 backdrop-blur-xs flex items-center justify-center z-50 p-4" 
                    onClick={closeViewer}
                >
                    <button 
                        onClick={closeViewer} 
                        className="absolute top-4 right-4 text-white p-2.5 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer"
                        title="Close (Esc)"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    {viewerList.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); prevItem(); }} 
                                className="absolute left-4 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer"
                                title="Previous (Left Arrow)"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); nextItem(); }} 
                                className="absolute right-4 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10 cursor-pointer"
                                title="Next (Right Arrow)"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    <div className="max-w-5xl w-full max-h-[85vh] flex flex-col items-center p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 text-center text-white/90 text-xs flex items-center gap-3">
                            {currentItem.folder && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold">
                                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                                    {currentItem.folder}
                                </span>
                            )}
                            <span className="text-slate-300 font-medium">{currentIndex + 1} of {viewerList.length}</span>
                        </div>

                        {currentItem.mediaType === 'video' || isVideoUrl(currentItem.url) ? (
                            <video 
                                src={currentItem.url} 
                                controls 
                                autoPlay 
                                className="max-h-[80vh] max-w-full rounded-lg shadow-2xl" 
                            />
                        ) : (
                            <img
                                src={getOptimizedImageUrl(currentItem.url, 'f_auto,q_auto')}
                                alt={`Media ${currentIndex + 1}`}
                                className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoAlbumPage;
