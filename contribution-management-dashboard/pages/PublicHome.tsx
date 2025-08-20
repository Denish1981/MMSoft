
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface Album {
    id: number;
    name: string;
    description: string;
    coverImage: string | null;
}

const PublicHomePage: React.FC = () => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchAlbums = async () => {
            try {
                const response = await fetch(`${API_URL}/public/albums`);
                if (!response.ok) {
                    throw new Error('Failed to fetch albums');
                }
                const data = await response.json();
                setAlbums(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAlbums();
    }, []);

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-wider">Contribution OS</h1>
                    <Link
                        to={isAuthenticated ? "/dashboard" : "/login"}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        {isAuthenticated ? "Go to Dashboard" : "Login"}
                    </Link>
                </nav>
            </header>
            <main className="container mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold text-slate-900">Photo Albums</h2>
                    <p className="mt-4 text-lg text-slate-600">Explore memories from our past events and festivals.</p>
                </div>

                {isLoading ? (
                    <div className="text-center">Loading albums...</div>
                ) : albums.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {albums.map(album => (
                            <Link to={`/album/${album.id}`} key={album.id} className="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                                <div className="relative h-56">
                                    {album.coverImage ? (
                                        <img src={album.coverImage} alt={album.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                            <span className="text-slate-500">No Image</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-800">{album.name}</h3>
                                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{album.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-500">No albums found.</div>
                )}
            </main>
             <footer className="text-center py-6 text-sm text-slate-400">
                © {new Date().getFullYear()} Contribution OS. All rights reserved.
            </footer>
        </div>
    );
};

export default PublicHomePage;
