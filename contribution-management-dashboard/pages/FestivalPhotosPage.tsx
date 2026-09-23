import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { 
    Folder, FolderPlus, UploadCloud, Image as ImageIcon, Video as VideoIcon, 
    Trash2, X, Play, Eye, Layers, Filter, Check, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import FestivalNavigation from '../components/FestivalNavigation';
import { getThumbnailImageUrl, getOptimizedImageUrl, isVideoUrl } from '../utils/imageUtils';

interface Festival {
    id: number;
    name: string;
}

interface FestivalPhoto {
    id: number;
    imageData: string;
    publicId?: string;
    folder?: string;
    mediaType?: 'image' | 'video';
    uploadedBy?: string;
    createdAt?: string;
}

interface StagedMedia {
    file: File;
    preview: string;
    isVideo: boolean;
    folder: string;
    sizeFormatted: string;
}

const PRESET_FOLDERS = ['General', 'Day 1', 'Day 2', 'Ceremony', 'Cultural Events', 'Pooja', 'Decorations', 'Stalls & Food'];

const FestivalPhotosPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token, logout, hasPermission } = useAuth();
    const [festival, setFestival] = useState<Festival | null>(null);
    const [photos, setPhotos] = useState<FestivalPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Folder selection & upload state
    const [selectedFolder, setSelectedFolder] = useState<string>('General');
    const [customFolderInput, setCustomFolderInput] = useState<string>('');
    const [isCreatingNewFolder, setIsCreatingNewFolder] = useState<boolean>(false);
    const [stagedFiles, setStagedFiles] = useState<StagedMedia[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    
    // View filter state
    const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');
    
    // Lightbox & delete modals
    const [activeViewerItem, setActiveViewerItem] = useState<FestivalPhoto | null>(null);
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

    // Compute distinct folders from existing photos plus presets
    const availableFolders = useMemo(() => {
        const folderSet = new Set<string>(PRESET_FOLDERS);
        photos.forEach(p => {
            if (p.folder && p.folder.trim()) {
                folderSet.add(p.folder.trim());
            }
        });
        return Array.from(folderSet);
    }, [photos]);

    // Folder counts for filtering
    const folderCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        photos.forEach(p => {
            const f = p.folder && p.folder.trim() ? p.folder.trim() : 'General';
            counts[f] = (counts[f] || 0) + 1;
        });
        return counts;
    }, [photos]);

    const filteredPhotos = useMemo(() => {
        if (activeFolderFilter === 'all') return photos;
        return photos.filter(p => (p.folder || 'General') === activeFolderFilter);
    }, [photos, activeFolderFilter]);

    // Group photos by folder
    const groupedPhotos = useMemo(() => {
        const groups: Record<string, FestivalPhoto[]> = {};
        photos.forEach(p => {
            const folderName = p.folder && p.folder.trim() ? p.folder.trim() : 'General';
            if (!groups[folderName]) groups[folderName] = [];
            groups[folderName].push(p);
        });
        return groups;
    }, [photos]);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        const folderToAssign = isCreatingNewFolder && customFolderInput.trim() 
            ? customFolderInput.trim() 
            : selectedFolder;

        const newStagedList: StagedMedia[] = [];

        newFiles.forEach(file => {
            const isVid = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(file.name);
            const previewUrl = URL.createObjectURL(file);
            newStagedList.push({
                file,
                preview: previewUrl,
                isVideo: isVid,
                folder: folderToAssign,
                sizeFormatted: formatBytes(file.size)
            });
        });

        setStagedFiles(prev => [...prev, ...newStagedList]);
        e.target.value = '';
    };

    const removeStagedFile = (index: number) => {
        setStagedFiles(prev => {
            const target = prev[index];
            if (target && target.preview) {
                URL.revokeObjectURL(target.preview);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleApplyFolderToAllStaged = (folderName: string) => {
        setStagedFiles(prev => prev.map(item => ({ ...item, folder: folderName })));
    };

    const handleUpload = async () => {
        if (stagedFiles.length === 0) return;
        setIsUploading(true);
        setError('');
        
        try {
            setUploadProgress('Preparing Cloudflare R2 upload authorization...');

            const uploadedPhotos: { 
                url: string; 
                publicId: string; 
                folder: string; 
                mediaType: 'image' | 'video'; 
            }[] = [];

            for (let i = 0; i < stagedFiles.length; i++) {
                const item = stagedFiles[i];
                const file = item.file;
                const fileFolder = item.folder || 'General';

                setUploadProgress(`Authorizing upload ${i + 1} of ${stagedFiles.length} (${file.name})...`);

                // Request Presigned PUT URL for Cloudflare R2 from backend
                const signRes = await fetch(`${API_URL}/festivals/photos/sign-upload`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        festivalId: id,
                        folder: fileFolder,
                        fileName: file.name,
                        contentType: file.type || (item.isVideo ? 'video/mp4' : 'image/jpeg')
                    })
                });

                if (signRes.status === 401) { logout(); return; }
                if (!signRes.ok) {
                    const errJson = await signRes.json().catch(() => ({}));
                    throw new Error(errJson.error || 'Failed to obtain Cloudflare R2 upload URL from server.');
                }

                const signData = await signRes.json();
                const uploadInfo = signData.uploads ? signData.uploads[0] : signData;

                if (!uploadInfo || !uploadInfo.uploadUrl) {
                    throw new Error('Server returned invalid upload authorization data.');
                }

                setUploadProgress(`Uploading ${i + 1} of ${stagedFiles.length} directly to Cloudflare R2...`);

                let directUploadSucceeded = false;
                try {
                    // Direct browser PUT to Cloudflare R2 presigned URL
                    const r2UploadRes = await fetch(uploadInfo.uploadUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': file.type || uploadInfo.contentType || 'application/octet-stream',
                        },
                        body: file,
                    });

                    if (r2UploadRes.ok) {
                        directUploadSucceeded = true;
                    } else {
                        console.warn('Direct R2 PUT response not ok, falling back to server relay:', r2UploadRes.statusText);
                    }
                } catch (r2PutErr) {
                    console.warn('Direct R2 PUT failed (likely bucket CORS setup), trying server fallback:', r2PutErr);
                }

                // If direct PUT failed (e.g. strict bucket CORS on user's cloud account), seamlessly use server fallback
                if (!directUploadSucceeded) {
                    setUploadProgress(`Relaying ${file.name} securely to Cloudflare R2...`);
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    const fallbackRes = await fetch(`${API_URL}/festivals/photos/direct-upload`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            festivalId: id,
                            folder: fileFolder,
                            fileName: file.name,
                            fileData: base64Data,
                            contentType: file.type || uploadInfo.contentType
                        })
                    });

                    if (!fallbackRes.ok) {
                        const fallbackErr = await fallbackRes.json().catch(() => ({}));
                        throw new Error(fallbackErr.error || `Failed to upload "${file.name}" to Cloudflare R2.`);
                    }

                    const fallbackData = await fallbackRes.json();
                    uploadedPhotos.push({
                        url: fallbackData.publicUrl,
                        publicId: fallbackData.key,
                        folder: fallbackData.folder || fileFolder,
                        mediaType: fallbackData.mediaType || (item.isVideo ? 'video' : 'image')
                    });
                } else {
                    uploadedPhotos.push({
                        url: uploadInfo.publicUrl,
                        publicId: uploadInfo.key,
                        folder: uploadInfo.folder || fileFolder,
                        mediaType: uploadInfo.mediaType || (item.isVideo ? 'video' : 'image')
                    });
                }
            }

            // Step 2: Store the resulting Cloudflare R2 URLs in the PostgreSQL database
            setUploadProgress('Saving media URLs and folder data to database...');
            const dbResponse = await fetch(`${API_URL}/festivals/${id}/photos`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ photos: uploadedPhotos }),
            });

            if (dbResponse.status === 401) { logout(); return; }
            if (!dbResponse.ok) {
                const errJson = await dbResponse.json().catch(() => ({}));
                throw new Error(errJson.error || 'Failed to save media metadata in database.');
            }

            // Clean up object URLs
            stagedFiles.forEach(item => {
                if (item.preview) URL.revokeObjectURL(item.preview);
            });
            setStagedFiles([]);
            setIsCreatingNewFolder(false);
            setCustomFolderInput('');
            await fetchPhotos();
        } catch (err) {
            console.error('Upload process error:', err);
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };
    
    const handleDelete = async () => {
        if (!photoToDelete) return;
        try {
            const response = await fetch(`${API_URL}/festivals/photos/${photoToDelete.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to delete media');

            setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
            if (activeViewerItem?.id === photoToDelete.id) {
                setActiveViewerItem(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deletion failed');
        } finally {
            setPhotoToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-16">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-3" />
                <span className="text-slate-600 font-medium">Loading festival gallery...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <FestivalNavigation festivalId={id!} festivalName={festival?.name} />
            
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700 flex-1">{error}</div>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {canUpload && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UploadCloud className="w-5 h-5 text-blue-600" />
                                Upload Photos & Videos to Cloudflare R2
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Files are uploaded directly to Cloudflare R2 object storage and linked to your festival.
                            </p>
                        </div>
                    </div>

                    {/* Folder specification */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Folder className="w-4 h-4 text-amber-500" />
                            Specify Target Folder / Category
                        </label>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {availableFolders.map(folder => (
                                <button
                                    key={folder}
                                    type="button"
                                    onClick={() => {
                                        setSelectedFolder(folder);
                                        setIsCreatingNewFolder(false);
                                        if (stagedFiles.length > 0) handleApplyFolderToAllStaged(folder);
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                        !isCreatingNewFolder && selectedFolder === folder
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400'
                                    }`}
                                >
                                    <Folder className="w-3.5 h-3.5" />
                                    {folder}
                                    {folderCounts[folder] ? (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            !isCreatingNewFolder && selectedFolder === folder ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {folderCounts[folder]}
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                            
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreatingNewFolder(true);
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                    isCreatingNewFolder
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                                }`}
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                                Custom Folder
                            </button>
                        </div>

                        {isCreatingNewFolder && (
                            <div className="flex items-center gap-2 max-w-md mt-2">
                                <input
                                    type="text"
                                    placeholder="Enter new folder name (e.g. Pooja Day 1, Fireworks)"
                                    value={customFolderInput}
                                    onChange={(e) => {
                                        setCustomFolderInput(e.target.value);
                                        if (e.target.value.trim() && stagedFiles.length > 0) {
                                            handleApplyFolderToAllStaged(e.target.value.trim());
                                        }
                                    }}
                                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-500">Will be created in R2</span>
                            </div>
                        )}
                    </div>

                    {/* Drag and drop upload box */}
                    <div className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-center bg-slate-50/50 transition">
                        <input 
                            type="file" 
                            id="photo-upload" 
                            multiple 
                            accept="image/*,video/*" 
                            className="sr-only" 
                            onChange={handleFileChange} 
                        />
                        <label htmlFor="photo-upload" className="cursor-pointer inline-flex flex-col items-center">
                            <div className="w-12 h-12 mb-3 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold text-blue-600 hover:underline">
                                Choose photographs and videos to upload
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                                Supported formats: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (multi-selection supported)
                            </p>
                        </label>
                    </div>

                    {/* Staged files review */}
                    {stagedFiles.length > 0 && (
                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600" />
                                    Staged Media Files ({stagedFiles.length})
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setStagedFiles([])}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                    Clear all
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {stagedFiles.map((item, index) => (
                                    <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                                        {item.isVideo ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-2">
                                                <VideoIcon className="w-8 h-8 text-blue-400 mb-1" />
                                                <span className="text-[10px] text-center font-medium line-clamp-1">{item.file.name}</span>
                                                <span className="text-[9px] text-slate-400">{item.sizeFormatted}</span>
                                            </div>
                                        ) : (
                                            <img 
                                                src={item.preview} 
                                                alt={`Preview ${index}`} 
                                                className="w-full h-full object-cover" 
                                            />
                                        )}
                                        
                                        {/* Folder tag */}
                                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                            <Folder className="w-2.5 h-2.5 text-amber-300" />
                                            {item.folder}
                                        </div>

                                        {/* Remove button */}
                                        <button 
                                            type="button"
                                            onClick={() => removeStagedFile(index)} 
                                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition"
                                            title="Remove"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3 bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                                <div>
                                    {uploadProgress ? (
                                        <p className="text-xs font-semibold text-blue-700 flex items-center gap-2">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            {uploadProgress}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-600">
                                            Target folder: <span className="font-semibold text-slate-800">{isCreatingNewFolder && customFolderInput ? customFolderInput : selectedFolder}</span>
                                        </p>
                                    )}
                                </div>
                                <button 
                                    onClick={handleUpload} 
                                    disabled={isUploading} 
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700 disabled:bg-slate-400 flex items-center justify-center gap-2 transition"
                                >
                                    {isUploading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Uploading to R2...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-4 h-4" />
                                            Upload {stagedFiles.length} Media {stagedFiles.length === 1 ? 'Item' : 'Items'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Gallery View Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Folder className="w-5 h-5 text-amber-500" />
                            Festival Media Gallery ({photos.length})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Browse photographs and videos organized by folder structure.
                        </p>
                    </div>

                    {/* View Controls */}
                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                                    viewMode === 'grid' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Filtered Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grouped')}
                                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                                    viewMode === 'grouped' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                By Folder View
                            </button>
                        </div>
                    </div>
                </div>

                {/* Folder filter tabs (for grid view) */}
                {viewMode === 'grid' && photos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                            <Filter className="w-3.5 h-3.5" />
                            Folder:
                        </span>
                        <button
                            type="button"
                            onClick={() => setActiveFolderFilter('all')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                activeFolderFilter === 'all'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            All ({photos.length})
                        </button>
                        {Object.entries(folderCounts).map(([folderName, count]) => (
                            <button
                                key={folderName}
                                type="button"
                                onClick={() => setActiveFolderFilter(folderName)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                    activeFolderFilter === folderName
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <Folder className="w-3.5 h-3.5 text-amber-500" />
                                {folderName}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    activeFolderFilter === folderName ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Media Presentation */}
                {photos.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-base font-semibold text-slate-700">No media uploaded yet</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Photographs and videos uploaded to Cloudflare R2 for this festival will be displayed here categorized by folder.
                        </p>
                    </div>
                ) : viewMode === 'grouped' ? (
                    /* Grouped by folder view */
                    <div className="space-y-8">
                        {Object.entries(groupedPhotos).map(([folderName, folderMedia]) => (
                            <div key={folderName} className="border border-slate-200 rounded-xl p-5 bg-slate-50/40">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Folder className="w-4 h-4 text-amber-500" />
                                        {folderName}
                                        <span className="text-xs font-normal text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                            {folderMedia.length} {folderMedia.length === 1 ? 'item' : 'items'}
                                        </span>
                                    </h4>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {folderMedia.map(photo => (
                                        <MediaCard
                                            key={photo.id}
                                            photo={photo}
                                            canDelete={canDelete}
                                            onView={() => setActiveViewerItem(photo)}
                                            onDelete={() => setPhotoToDelete(photo)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Filtered Grid View */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredPhotos.map(photo => (
                            <MediaCard
                                key={photo.id}
                                photo={photo}
                                canDelete={canDelete}
                                onView={() => setActiveViewerItem(photo)}
                                onDelete={() => setPhotoToDelete(photo)}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {/* Lightbox Modal for Photo or Video */}
            {activeViewerItem && (
                <div 
                    className="fixed inset-0 bg-black/90 backdrop-blur-xs flex items-center justify-center z-[110] p-4" 
                    onClick={() => setActiveViewerItem(null)}
                >
                    <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <div className="w-full flex items-center justify-between text-white mb-2 px-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-amber-500/80 text-white text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                    <Folder className="w-3 h-3" />
                                    {activeViewerItem.folder || 'General'}
                                </span>
                                {activeViewerItem.uploadedBy && (
                                    <span className="text-xs text-slate-300">
                                        Uploaded by: {activeViewerItem.uploadedBy}
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => setActiveViewerItem(null)} 
                                className="text-white hover:text-slate-300 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="w-full flex justify-center items-center bg-black/50 rounded-lg overflow-hidden max-h-[80vh]">
                            {activeViewerItem.mediaType === 'video' || isVideoUrl(activeViewerItem.imageData) ? (
                                <video 
                                    src={activeViewerItem.imageData} 
                                    controls 
                                    autoPlay 
                                    className="max-h-[80vh] max-w-full rounded-lg" 
                                />
                            ) : (
                                <img
                                    src={getOptimizedImageUrl(activeViewerItem.imageData, 'f_auto,q_auto')}
                                    alt={`Festival photo ${activeViewerItem.id}`}
                                    className="max-h-[80vh] max-w-full object-contain rounded-lg"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Deletion Modal */}
            {photoToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-[120] p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Delete Media Item</h2>
                        <p className="text-sm text-slate-600 mb-6">
                            Are you sure you want to permanently delete this {photoToDelete.mediaType || 'photo'} from Cloudflare R2 and festival records?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setPhotoToDelete(null)} 
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete} 
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MediaCardProps {
    photo: FestivalPhoto;
    canDelete: boolean;
    onView: () => void;
    onDelete: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ photo, canDelete, onView, onDelete }) => {
    const isVideo = photo.mediaType === 'video' || isVideoUrl(photo.imageData);

    return (
        <div className="relative aspect-square group rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-xs cursor-pointer" onClick={onView}>
            {isVideo ? (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center relative">
                    <video 
                        src={photo.imageData} 
                        preload="metadata" 
                        className="w-full h-full object-cover opacity-70" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                    </div>
                    <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <VideoIcon className="w-2.5 h-2.5" />
                        Video
                    </span>
                </div>
            ) : (
                <img
                    src={getThumbnailImageUrl(photo.imageData, 400, 400)}
                    alt={`Festival photo ${photo.id}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            )}

            {/* Folder Badge */}
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 pointer-events-none">
                <Folder className="w-3 h-3 text-amber-300" />
                {photo.folder || 'General'}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-between p-3 text-center">
                <div className="w-full flex justify-end">
                    {canDelete && (
                        <button 
                            type="button"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onDelete(); 
                            }} 
                            className="text-white p-1.5 bg-red-600 rounded-full hover:bg-red-700 shadow-sm transition"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="text-white">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
                        <Eye className="w-3.5 h-3.5" />
                        View Full
                    </span>
                </div>

                <div className="w-full">
                    {photo.uploadedBy && (
                        <p className="text-white/80 text-[10px]">
                            By: <span className="font-semibold text-white">{photo.uploadedBy}</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FestivalPhotosPage;
