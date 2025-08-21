
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { CloseIcon } from '../components/icons/CloseIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import FestivalNavigation from '../components/FestivalNavigation';

interface Festival {
    id: number;
    name: string;
}

interface FestivalPhoto {
    id: number;
    imageData: string;
    uploadedBy?: string;
}

const FestivalPhotosPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token, logout, hasPermission } = useAuth();
    const [festival, setFestival] = useState<Festival | null>(null);
    const [photos, setPhotos] = useState<FestivalPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [stagedFiles, setStagedFiles] = useState<{ file: File, preview: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const [photoToDelete, setPhotoToDelete] = useState<FestivalPhoto | null>(null);

    const canUpload = hasPermission('action:edit');
    const canDelete = hasPermission('action:delete');

    const getAuthHeaders = useCallback(() => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    const fetchPhotos = useCallback(async () => {
        if (!id || !token) return;
        try {
            const response = await fetch(`${API_URL}/festivals/${id}/photos`, { headers: getAuthHeaders() });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to fetch photos');
            const data: FestivalPhoto[] = await response.json();
            setPhotos(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    }, [id, token, getAuthHeaders, logout]);

    useEffect(() => {
        const fetchFestivalDetails = async () => {
            if (!id || !token) return;
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/festivals/${id}`, { headers: getAuthHeaders() });
                if (response.status === 401) { logout(); return; }
                if (!response.ok) throw new Error('Failed to fetch festival details');
                setFestival(await response.json());
                await fetchPhotos();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        fetchFestivalDetails();
    }, [id, token, fetchPhotos, getAuthHeaders, logout]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);

            const readPromises = newFiles.map(file => {
                return new Promise<{ file: File, preview: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ file, preview: reader.result as string });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(readPromises)
                .then(newStagedFiles => {
                    setStagedFiles(prev => [...prev, ...newStagedFiles]);
                })
                .catch(error => console.error("Error reading files for preview:", error));
        }
        e.target.value = '';
    };

    const removePreview = (index: number) => {
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleUpload = async () => {
        if (stagedFiles.length === 0) return;
        setIsUploading(true);
        
        try {
            const base64Images = stagedFiles.map(f => f.preview);
            const response = await fetch(`${API_URL}/festivals/${id}/photos`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ images: base64Images }),
            });
             if (response.status === 401) { logout(); return; }
             if (!response.ok) throw new Error('Upload failed');

             setStagedFiles([]);
             await fetchPhotos();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!photoToDelete) return;
        try {
            const response = await fetch(`${API_URL}/photos/${photoToDelete.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to delete photo');

            setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deletion failed');
        } finally {
            setPhotoToDelete(null);
        }
    }

    if (isLoading) return <div className="text-center p-8">Loading...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <FestivalNavigation festivalId={id!} festivalName={festival?.name} />
            
            {canUpload && (
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload New Photos</h3>
                    <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg text-center">
                        <input type="file" id="photo-upload" multiple accept="image/*" className="sr-only" onChange={handleFileChange} />
                        <label htmlFor="photo-upload" className="cursor-pointer text-blue-600 font-semibold">
                            Select files to upload
                        </label>
                        <p className="text-xs text-slate-500 mt-1">You can select multiple images.</p>
                    </div>
                    {stagedFiles.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-slate-700 mb-2">Staged for Upload ({stagedFiles.length})</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {stagedFiles.map((item, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <img src={item.preview} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md" />
                                        <button onClick={() => removePreview(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><CloseIcon className="w-3 h-3"/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="text-right mt-4">
                                <button onClick={handleUpload} disabled={isUploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400">
                                    {isUploading ? 'Uploading...' : `Upload ${stagedFiles.length} Photos`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Existing Photos ({photos.length})</h3>
                {photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {photos.map(photo => (
                            <div key={photo.id} className="relative aspect-square group">
                                <img src={photo.imageData} alt={`Festival photo ${photo.id}`} className="w-full h-full object-cover rounded-lg" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                    {canDelete && (
                                        <button onClick={() => setPhotoToDelete(photo)} className="text-white p-2 bg-red-600 rounded-full hover:bg-red-700"><DeleteIcon className="w-5 h-5" /></button>
                                    )}
                                    {photo.uploadedBy && (
                                        <p className="text-white text-xs mt-2">
                                            Uploaded by:<br/>
                                            <span className="font-semibold">{photo.uploadedBy}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-8">No photos have been uploaded for this festival yet.</p>
                )}
            </div>
            
            {photoToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
                    <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Confirm Deletion</h2>
                        <p className="text-slate-600 mb-8">Are you sure you want to permanently delete this photo?</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setPhotoToDelete(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FestivalPhotosPage;