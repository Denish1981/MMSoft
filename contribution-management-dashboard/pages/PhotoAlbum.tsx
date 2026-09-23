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
    
    const [activeFolder, setActiveFolder] = useState<string>('all');
    const [viewerOpen, setViewerOpen] = useState(false);
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
            return album.photos;
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
            const f = item.folder && item.folder.trim() ? item.folder.trim() : 'General';
            counts[f] = (counts[f] || 0) + 1;
        });
        return counts;
    }, [mediaList]);

    const filteredMedia = useMemo(() => {
        if (activeFolder === 'all') return mediaList;
        return mediaList.filter(item => (item.folder || 'General') === activeFolder);
    }, [mediaList, activeFolder]);

    const openViewer = (index: number) => {
        setCurrentIndex(index);
        setViewerOpen(true);
    };

    const closeViewer = () => setViewerOpen(false);

    const nextItem = () => {
        if (filteredMedia.length > 0) {
            setCurrentIndex((prev) => (prev + 1) % filteredMedia.length);
        }
    };

    const prevItem = () => {
        if (filteredMedia.length > 0) {
            setCurrentIndex((prev) => (prev - 1 + filteredMedia.length) % filteredMedia.length);
        }
    };

    const currentItem = filteredMedia[currentIndex] || null;

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-xs sticky top-0 z-20 border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Link 
                            to={album?.campaignId ? `/photos/campaign/${album.campaignId}` : "/photos"} 
                            className="text-slate-600 hover:text-blue-600 flex items-center text-sm font-semibold transition"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            {album?.campaignName ? `Back to ${album.campaignName}` : 'Back to Photo Albums'}
                        </Link>
                    </div>
                    {album && <h1 className="text-lg font-bold text-slate-800 line-clamp-1">{album.name}</h1>}
                    <div className="w-12" />
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 md:py-12">
                {isLoading && (
                    <div className="text-center py-20 text-slate-600">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Loading album...
                    </div>
                )}
                {error && <div className="text-center text-red-500 py-16">{error}</div>}
                
                {album && (
                    <>
                        <div className="text-center mb-8 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{album.name}</h2>
                            <p className="mt-2 text-sm md:text-base font-medium text-slate-500">
                                {formatUTCDate(album.startDate, { day: 'numeric', month: 'long', year: 'numeric' })} - {formatUTCDate(album.endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {album.description && (
                                <p className="mt-3 text-sm md:text-base text-slate-600">{album.description}</p>
                            )}
                        </div>

                        {/* Folder filter tabs */}
                        {Object.keys(folderCounts).length > 1 && (
                            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                                    Folders:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setActiveFolder('all')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                                        activeFolder === 'all'
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    All ({mediaList.length})
                                </button>
                                {Object.entries(folderCounts).map(([folderName, count]) => (
                                    <button
                                        key={folderName}
                                        type="button"
                                        onClick={() => setActiveFolder(folderName)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                                            activeFolder === folderName
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                                        {folderName}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            activeFolder === folderName ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredMedia.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredMedia.map((item, index) => {
                                    const isVid = item.mediaType === 'video' || isVideoUrl(item.url);
                                    return (
                                        <div 
                                            key={item.id || index} 
                                            className="aspect-square bg-slate-200 rounded-xl overflow-hidden cursor-pointer group relative shadow-xs" 
                                            onClick={() => openViewer(index)}
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
                                                    alt={`Album media ${index + 1}`}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            )}

                                            {/* Folder Pill */}
                                            {item.folder && item.folder !== 'General' && (
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
                            <div className="text-center text-slate-500 py-16">
                                <p className="text-base font-medium">No media items found in this category.</p>
                            </div>
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
                        className="absolute top-4 right-4 text-white p-2.5 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    {filteredMedia.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); prevItem(); }} 
                                className="absolute left-4 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); nextItem(); }} 
                                className="absolute right-4 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    <div className="max-w-5xl w-full max-h-[85vh] flex flex-col items-center p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 text-center text-white/80 text-xs flex items-center gap-2">
                            {currentItem.folder && (
                                <span className="bg-white/10 px-2 py-0.5 rounded flex items-center gap-1 text-amber-300">
                                    <Folder className="w-3 h-3" />
                                    {currentItem.folder}
                                </span>
                            )}
                            <span>{currentIndex + 1} of {filteredMedia.length}</span>
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
