
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../config';
import { CloseIcon } from '../components/icons/CloseIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';

interface AlbumDetails {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    images: string[];
}

const PhotoAlbumPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [album, setAlbum] = useState<AlbumDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    const openViewer = (index: number) => {
        setCurrentImageIndex(index);
        setViewerOpen(true);
    };

    const closeViewer = () => setViewerOpen(false);

    const nextImage = () => {
        if (album) {
            setCurrentImageIndex((prev) => (prev + 1) % album.images.length);
        }
    };

    const prevImage = () => {
        if (album) {
            setCurrentImageIndex((prev) => (prev - 1 + album.images.length) % album.images.length);
        }
    };
    
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm">
                 <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link to="/" className="text-slate-600 hover:text-blue-600 flex items-center">
                        <ChevronLeftIcon className="w-5 h-5 mr-2" /> Back to Albums
                    </Link>
                    {album && <h1 className="text-xl font-bold text-slate-800">{album.name}</h1>}
                    <div></div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                {isLoading && <div className="text-center">Loading album...</div>}
                {error && <div className="text-center text-red-500">{error}</div>}
                {album && (
                    <>
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-extrabold text-slate-900">{album.name}</h2>
                            <p className="mt-2 text-lg font-medium text-slate-500">{formatDate(album.startDate)} - {formatDate(album.endDate)}</p>
                            <p className="mt-4 max-w-3xl mx-auto text-slate-600">{album.description}</p>
                        </div>
                        {album.images.length > 0 ? (
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {album.images.map((image, index) => (
                                    <div key={index} className="aspect-square bg-slate-200 rounded-lg overflow-hidden cursor-pointer group" onClick={() => openViewer(index)}>
                                        <img src={image} alt={`Album image ${index + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-16">
                                <p className="text-xl">No photos have been uploaded for this album yet.</p>
                            </div>
                        )}
                    </>
                )}
            </main>
            
            {viewerOpen && album && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={closeViewer}>
                    <button onClick={closeViewer} className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors"><CloseIcon className="w-8 h-8" /></button>
                    
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors"><ChevronLeftIcon className="w-8 h-8" /></button>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 text-white p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors"><ChevronRightIcon className="w-8 h-8" /></button>

                    <div className="p-4" onClick={(e) => e.stopPropagation()}>
                        <img src={album.images[currentImageIndex]} alt={`Image ${currentImageIndex + 1}`} className="max-h-[90vh] max-w-[90vw] object-contain" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoAlbumPage;
