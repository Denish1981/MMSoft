import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { API_URL } from '../config';
import { compressImageFile } from '../utils/imageUtils';
import { parseTowerAndFlatFromDonorName, TOWER_OPTIONS } from '../utils/donorLocationUtils';
import type { Contribution } from '../types/index';
import { ContributionStatus } from '../types/index';
import ContributionsNavigation from '../components/ContributionsNavigation';
import ImageViewerModal from '../components/ImageViewerModal';
import {
    Upload, Trash2, RotateCw, ZoomIn, ZoomOut, CheckCircle2,
    AlertTriangle, Image as ImageIcon, ChevronLeft, ChevronRight,
    Save, Plus, RefreshCw, Layers, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';

interface ReceiptBatchItem {
    id: string; // Unique client-side ID
    fileName: string;
    originalSize: number;
    compressedSize: number;
    imageData: string; // Base64 data URL
    rotation: number; // 0, 90, 180, 270
    
    // Form fields
    combinedTowerFlat: string;
    parsedTower: string;
    parsedFlat: string;
    amount: number | '';
    numberOfCoupons: number;
    date: string;
    paymentType: 'Cash' | 'Online' | 'Cheque';
    notes?: string;
}

const STORAGE_KEY = 'gtmm_paper_receipt_batch_items';
const STORAGE_CAMPAIGN_KEY = 'gtmm_paper_receipt_batch_campaign';

const PaperReceiptsPage: React.FC = () => {
    const { token, logout, hasPermission } = useAuth();
    const { contributions, campaigns, setContributions } = useData();

    const isManager = hasPermission('action:edit') || hasPermission('action:users:manage') || hasPermission('action:create');

    // Selected Campaign
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_CAMPAIGN_KEY);
            if (saved) {
                const num = Number(saved);
                if (!isNaN(num) && num > 0) return num;
            }
        } catch (e) {
            console.error('Failed to read campaign from localStorage', e);
        }
        return null;
    });

    // Default batch settings
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [defaultDate, setDefaultDate] = useState<string>(todayStr);
    const [defaultPaymentType, setDefaultPaymentType] = useState<'Cash' | 'Online' | 'Cheque'>('Cash');
    const [defaultAmount, setDefaultAmount] = useState<number | ''>(2500);
    const [defaultCoupons, setDefaultCoupons] = useState<number>(4);

    // Batch items state
    const [batchItems, setBatchItems] = useState<ReceiptBatchItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('Failed to read batch items from localStorage', e);
        }
        return [];
    });

    // Active image index for preview
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const appendFileInputRef = useRef<HTMLInputElement>(null);
    const rowInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // Ensure active campaign is selected if none set
    useEffect(() => {
        if (campaigns.length > 0) {
            const exists = campaigns.some(c => c.id === selectedCampaignId);
            if (!exists) {
                const active = campaigns.find(c => c.isActive) || campaigns[0];
                if (active) {
                    setSelectedCampaignId(active.id);
                    localStorage.setItem(STORAGE_CAMPAIGN_KEY, String(active.id));
                }
            }
        }
    }, [campaigns, selectedCampaignId]);

    // Save batch to localStorage
    useEffect(() => {
        try {
            if (batchItems.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(batchItems));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.error('Failed to save batch items to localStorage', e);
        }
    }, [batchItems]);

    // Save campaign selection
    useEffect(() => {
        if (selectedCampaignId) {
            localStorage.setItem(STORAGE_CAMPAIGN_KEY, String(selectedCampaignId));
        }
    }, [selectedCampaignId]);

    // Ensure activeIndex is within bounds
    useEffect(() => {
        if (batchItems.length === 0) {
            setActiveIndex(0);
        } else if (activeIndex >= batchItems.length) {
            setActiveIndex(batchItems.length - 1);
        }
    }, [batchItems.length, activeIndex]);

    // Map of existing contributions in the selected campaign to check for duplicates
    const existingContributionsMap = useMemo(() => {
        const map = new Map<string, Contribution>();
        if (!selectedCampaignId) return map;

        contributions
            .filter(c => c.campaignId === selectedCampaignId && c.status !== ContributionStatus.Failed && !c.deletedAt)
            .forEach(c => {
                if (c.towerNumber && c.flatNumber) {
                    const key = `${c.towerNumber.trim().toLowerCase()}_${c.flatNumber.trim().toLowerCase()}`;
                    map.set(key, c);
                }
            });
        return map;
    }, [contributions, selectedCampaignId]);

    // Handle image file selection & compression
    const processFiles = async (files: FileList | File[], isAppend = false) => {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileArray.length === 0) return;

        setIsUploading(true);
        setUploadProgress({ current: 0, total: fileArray.length });

        const newItems: ReceiptBatchItem[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            try {
                // Compress image to ~1200px / ~150KB JPEG for fast networking and database storage
                const compressedDataUrl = await compressImageFile(file, 1200, 1200, 0.82);
                
                // Calculate compressed size in KB
                const head = 'data:image/jpeg;base64,';
                const compressedSize = Math.round(((compressedDataUrl.length - head.length) * 3) / 4);

                // Try to infer tower/flat if the filename contains clues like "42_1105.jpg" or "42-1105"
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const inferred = parseTowerAndFlatFromDonorName(nameWithoutExt);

                const item: ReceiptBatchItem = {
                    id: `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    fileName: file.name,
                    originalSize: file.size,
                    compressedSize,
                    imageData: compressedDataUrl,
                    rotation: 0,
                    combinedTowerFlat: inferred.towerNumber && inferred.flatNumber ? `${inferred.towerNumber}-${inferred.flatNumber}` : '',
                    parsedTower: inferred.towerNumber,
                    parsedFlat: inferred.flatNumber,
                    amount: defaultAmount,
                    numberOfCoupons: defaultCoupons,
                    date: defaultDate,
                    paymentType: defaultPaymentType,
                };

                newItems.push(item);
            } catch (err) {
                console.error('Error compressing image:', file.name, err);
            }
            setUploadProgress({ current: i + 1, total: fileArray.length });
        }

        if (isAppend) {
            setBatchItems(prev => [...prev, ...newItems]);
        } else {
            setBatchItems(newItems);
            setActiveIndex(0);
        }

        setIsUploading(false);
        setUploadProgress(null);
        setStatusMessage({
            type: 'success',
            text: `Successfully staged ${newItems.length} receipt photo${newItems.length > 1 ? 's' : ''}. Enter the details below.`
        });
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, isAppend = false) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files, isAppend);
            e.target.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files, batchItems.length > 0);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Update single item field
    const updateBatchItem = (id: string, updates: Partial<ReceiptBatchItem>) => {
        setBatchItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };

            // If combinedTowerFlat changed, automatically parse Tower and Flat
            if ('combinedTowerFlat' in updates && updates.combinedTowerFlat !== undefined) {
                const parsed = parseTowerAndFlatFromDonorName(updates.combinedTowerFlat);
                updated.parsedTower = parsed.towerNumber;
                updated.parsedFlat = parsed.flatNumber;
            }

            return updated;
        }));
    };

    // Delete single receipt item
    const deleteBatchItem = (id: string) => {
        const indexToDelete = batchItems.findIndex(item => item.id === id);
        setBatchItems(prev => prev.filter(item => item.id !== id));
        if (activeIndex >= indexToDelete && activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
        }
    };

    // Rotate active receipt photo
    const rotateActiveImage = () => {
        if (!batchItems[activeIndex]) return;
        const currentItem = batchItems[activeIndex];
        const newRotation = (currentItem.rotation + 90) % 360;
        updateBatchItem(currentItem.id, { rotation: newRotation });
    };

    // Apply batch defaults to all currently unfilled / all rows
    const handleApplyDefaultsToAll = () => {
        if (batchItems.length === 0) return;
        setBatchItems(prev => prev.map(item => ({
            ...item,
            date: defaultDate,
            paymentType: defaultPaymentType,
            amount: defaultAmount !== '' ? defaultAmount : item.amount,
            numberOfCoupons: defaultCoupons,
        })));
        setStatusMessage({
            type: 'success',
            text: `Applied default Date (${defaultDate}), Mode (${defaultPaymentType}), Amount (₹${defaultAmount || 0}) to all ${batchItems.length} records.`
        });
    };

    // Clear entire batch
    const handleClearBatch = () => {
        if (batchItems.length === 0) return;
        if (window.confirm('Are you sure you want to clear all uploaded receipts in this batch? Any unsaved entries will be removed.')) {
            setBatchItems([]);
            localStorage.removeItem(STORAGE_KEY);
            setActiveIndex(0);
            setStatusMessage(null);
        }
    };

    // Check duplicate status for a specific item
    const getItemDuplicateStatus = useCallback((item: ReceiptBatchItem, index: number) => {
        if (!item.parsedTower || !item.parsedFlat) {
            return { isDuplicate: false, message: null, source: null };
        }

        const key = `${item.parsedTower.trim().toLowerCase()}_${item.parsedFlat.trim().toLowerCase()}`;

        // 1. Check against Database contributions
        const dbMatch = existingContributionsMap.get(key);
        if (dbMatch) {
            const formattedDate = dbMatch.date ? new Date(dbMatch.date).toLocaleDateString('en-GB') : 'recorded date';
            return {
                isDuplicate: true,
                message: `Already in DB: ₹${dbMatch.amount.toLocaleString('en-IN')} on ${formattedDate} (${dbMatch.type || 'Cash'})`,
                source: 'db' as const,
                existingContribution: dbMatch
            };
        }

        // 2. Check against other items in the same current batch
        const duplicateInBatchIndex = batchItems.findIndex((other, idx) => 
            idx !== index &&
            other.parsedTower &&
            other.parsedFlat &&
            other.parsedTower.trim().toLowerCase() === item.parsedTower.trim().toLowerCase() &&
            other.parsedFlat.trim().toLowerCase() === item.parsedFlat.trim().toLowerCase()
        );

        if (duplicateInBatchIndex !== -1) {
            return {
                isDuplicate: true,
                message: `Duplicate in this batch with Receipt #${duplicateInBatchIndex + 1}`,
                source: 'batch' as const
            };
        }

        return { isDuplicate: false, message: null, source: null };
    }, [existingContributionsMap, batchItems]);

    // Summary statistics
    const stats = useMemo(() => {
        const total = batchItems.length;
        let readyCount = 0;
        let duplicateCount = 0;
        let totalAmount = 0;

        batchItems.forEach((item, idx) => {
            const dup = getItemDuplicateStatus(item, idx);
            if (dup.isDuplicate) duplicateCount++;
            
            const hasValidTower = Boolean(item.parsedTower);
            const hasValidFlat = Boolean(item.parsedFlat);
            const hasValidAmount = typeof item.amount === 'number' && item.amount > 0;

            if (hasValidTower && hasValidFlat && hasValidAmount) {
                readyCount++;
                totalAmount += Number(item.amount) || 0;            }
        });

        return { total, readyCount, duplicateCount, totalAmount };
    }, [batchItems, getItemDuplicateStatus]);

    // Save All Valid Records
    const handleSaveAll = async () => {
        if (!selectedCampaignId) {
            setStatusMessage({ type: 'error', text: 'Please select a default Campaign before saving.' });
            return;
        }

        const validItems = batchItems.filter(item => 
            item.parsedTower && 
            item.parsedFlat && 
            typeof item.amount === 'number' && 
            item.amount > 0
        );

        if (validItems.length === 0) {
            setStatusMessage({
                type: 'error',
                text: 'No completed records ready to save. Please enter Tower, Flat Number, and Amount for your receipts.'
            });
            return;
        }

        const incompleteCount = batchItems.length - validItems.length;
        if (incompleteCount > 0) {
            const proceed = window.confirm(
                `${validItems.length} of ${batchItems.length} receipts are complete and ready.\n\n${incompleteCount} receipts are missing flat or amount details and will remain in the queue.\n\nDo you want to save the ${validItems.length} valid receipts now?`
            );
            if (!proceed) return;
        }

        setIsSaving(true);
        setStatusMessage(null);

        try {
            // Prepare payload for POST /api/contributions/bulk
            const payload = validItems.map(item => ({
                donorName: `Tower ${item.parsedTower} - Flat ${item.parsedFlat}`,
                towerNumber: item.parsedTower,
                flatNumber: item.parsedFlat,
                amount: Number(item.amount),
                numberOfCoupons: Number(item.numberOfCoupons) || 0,
                campaignId: selectedCampaignId,
                date: item.date || defaultDate,
                type: item.paymentType,
                status: ContributionStatus.Completed,
                image: item.imageData, // Stores Base64 receipt directly in database
                notes: item.notes || `Paper receipt batch entry (${item.fileName})`
            }));

            const response = await fetch(`${API_URL}/contributions/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ contributions: payload })
            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save contributions');
            }

            const savedContributions: Contribution[] = await response.json();
            setContributions(prev => [...savedContributions, ...prev]);

            // Remove saved valid items from batch state, keep any incomplete items for the user to finish
            const savedIds = new Set(validItems.map(v => v.id));
            const remainingItems = batchItems.filter(item => !savedIds.has(item.id));
            setBatchItems(remainingItems);

            if (remainingItems.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
            }

            setStatusMessage({
                type: 'success',
                text: `🎉 Successfully saved ${savedContributions.length} contribution records with attached receipts! Total: ₹${stats.totalAmount.toLocaleString('en-IN')}`
            });

        } catch (error) {
            console.error('Error saving paper receipt batch:', error);
            setStatusMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'An error occurred while saving.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard navigation (Alt + Left / Alt + Right) to cycle through images
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                setActiveIndex(prev => Math.max(0, prev - 1));
            } else if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                setActiveIndex(prev => Math.min(batchItems.length - 1, prev + 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [batchItems.length]);

    if (!isManager) {
        return (
            <div className="space-y-6">
                <ContributionsNavigation />
                <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-lg mx-auto">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
                    <p className="text-sm text-slate-600 mt-2">
                        Paper receipt batch updates are only accessible to Admin and Manager roles.
                    </p>
                </div>
            </div>
        );
    }

    const activeItem = batchItems[activeIndex];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <ContributionsNavigation />

            {/* Header and Summary Banner */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                                <Layers className="w-5 h-5" />
                            </span>
                            <h1 className="text-2xl font-bold text-slate-900">Paper Receipt Batch Entry</h1>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                            Upload photos of door-to-door collection receipts, enter flat details with real-time duplicate detection, and save all records in one step.
                        </p>
                    </div>

                    {/* Quick Stats Chips */}
                    {batchItems.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700">
                                Total Receipts: <span className="font-bold text-slate-900 ml-1">{stats.total}</span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-800">
                                Ready to Save: <span className="font-bold text-emerald-700 ml-1">{stats.readyCount} / {stats.total}</span>
                            </div>
                            {stats.duplicateCount > 0 && (
                                <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-medium text-amber-800 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{stats.duplicateCount} Duplicate{stats.duplicateCount > 1 ? 's' : ''}</span>
                                </div>
                            )}
                            <div className="bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-medium text-blue-800">
                                Total Amount: <span className="font-bold text-blue-700 ml-1">₹{stats.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Batch Settings Bar */}
                <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Campaign Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Campaign <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={selectedCampaignId ?? ''}
                            onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="" disabled>Select Campaign</option>
                            {campaigns.map(camp => (
                                <option key={camp.id} value={camp.id}>
                                    {camp.name} {camp.isActive ? '(Active)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Default Date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Default Date
                        </label>
                        <input
                            type="date"
                            value={defaultDate}
                            onChange={(e) => setDefaultDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Default Payment Mode */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Default Payment Mode
                        </label>
                        <select
                            value={defaultPaymentType}
                            onChange={(e) => setDefaultPaymentType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Online">Online / UPI</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>

                    {/* Default Amount */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Default Amount (₹)
                        </label>
                        <input
                            type="number"
                            value={defaultAmount}
                            onChange={(e) => setDefaultAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="e.g. 2500"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Default Coupons & Apply Action */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Default Coupons
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="4"
                                value={defaultCoupons}
                                onChange={(e) => setDefaultCoupons(Math.min(4, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                                className="w-20 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {batchItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleApplyDefaultsToAll}
                                    title="Apply these defaults to all uploaded rows"
                                    className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
                                >
                                    Apply to All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Notifications */}
            {statusMessage && (
                <div
                    className={`p-4 rounded-xl flex items-start justify-between gap-3 text-sm font-medium shadow-sm transition-all ${
                        statusMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            : statusMessage.type === 'error'
                            ? 'bg-rose-50 text-rose-900 border border-rose-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                        {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                        {statusMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
                        <span>{statusMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setStatusMessage(null)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Upload Area (Shown when empty or expandable) */}
            {batchItems.length === 0 ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/70 transition-all rounded-2xl p-12 text-center cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileInputChange(e, false)}
                        className="hidden"
                    />
                    
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            {isUploading ? (
                                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                            ) : (
                                <Upload className="w-8 h-8" />
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {isUploading ? 'Compressing & Staging Photos...' : 'Drop Multiple Receipt Photos Here'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Drag & drop multiple images or click to select from your phone/desktop.
                            </p>
                        </div>

                        {uploadProgress && (
                            <div className="space-y-1.5 pt-2">
                                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-2 transition-all duration-200"
                                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs font-semibold text-blue-700">
                                    Processed {uploadProgress.current} of {uploadProgress.total} images
                                </p>
                            </div>
                        )}

                        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
                            <span>✓ Automatic Image Compression</span>
                            <span>•</span>
                            <span>✓ Direct Base64 DB Attachment</span>
                            <span>•</span>
                            <span>✓ Batch Duplicate Check</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Dual-Pane Workspace */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Sticky Receipt Image Viewer (5 cols) */}
                    <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-4 shadow-lg sticky top-4 overflow-hidden flex flex-col h-[650px]">
                        {/* Image Viewer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded">
                                    #{activeIndex + 1} of {batchItems.length}
                                </span>
                                <span className="text-slate-300 font-mono truncate max-w-[180px]" title={activeItem?.fileName}>
                                    {activeItem?.fileName}
                                </span>
                            </div>

                            {/* Viewer Controls */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={rotateActiveImage}
                                    title="Rotate 90°"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors"
                                >
                                    <RotateCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3))}
                                    title="Zoom In"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.7))}
                                    title="Zoom Out"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setZoomLevel(1)}
                                    title="Reset Zoom"
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-lg transition-colors"
                                >
                                    100%
                                </button>
                                <button
                                    onClick={() => setFullscreenImage(activeItem?.imageData || null)}
                                    title="Fullscreen Preview"
                                    className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Image Display Canvas */}
                        <div className="flex-1 bg-slate-950/60 rounded-xl my-3 flex items-center justify-center overflow-auto relative p-2 select-none">
                            {activeItem ? (
                                <img
                                    src={activeItem.imageData}
                                    alt={`Receipt ${activeIndex + 1}`}
                                    style={{
                                        transform: `rotate(${activeItem.rotation}deg) scale(${zoomLevel})`,
                                        transformOrigin: 'center center',
                                        transition: 'transform 0.15s ease-out',
                                        maxHeight: '100%',
                                        maxWidth: '100%',
                                        objectFit: 'contain'
                                    }}
                                    className="rounded shadow-md cursor-pointer"
                                    onClick={() => setFullscreenImage(activeItem.imageData)}
                                />
                            ) : (
                                <p className="text-slate-500 text-sm">No image selected</p>
                            )}
                        </div>

                        {/* Image Viewer Navigation Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                                disabled={activeIndex === 0}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-xs font-semibold text-white rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Prev <span className="text-[10px] text-slate-400 ml-1 hidden sm:inline">(Alt+←)</span>
                            </button>

                            <div className="text-center">
                                <span className="text-xs text-slate-400">
                                    Compressed: <strong className="text-slate-200">{(activeItem?.compressedSize ? activeItem.compressedSize / 1024 : 0).toFixed(0)} KB</strong>
                                </span>
                            </div>

                            <button
                                onClick={() => setActiveIndex(prev => Math.min(batchItems.length - 1, prev + 1))}
                                disabled={activeIndex === batchItems.length - 1}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-xs font-semibold text-white rounded-lg transition-colors"
                            >
                                Next <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">(Alt+→)</span> <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Receipt Form Grid & Action Bar (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Batch Action Toolbar */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={appendFileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileInputChange(e, true)}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => appendFileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-slate-600" /> Add More Photos
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearBatch}
                                    className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>

                            {/* Main Save Action */}
                            <button
                                type="button"
                                onClick={handleSaveAll}
                                disabled={isSaving || stats.readyCount === 0 || !selectedCampaignId}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition-all duration-200"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Saving {stats.readyCount} Records...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Save All ({stats.readyCount} Ready)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* List of Receipt Records */}
                        <div className="space-y-3">
                            {batchItems.map((item, index) => {
                                const isActive = index === activeIndex;
                                const duplicateInfo = getItemDuplicateStatus(item, index);
                                const isReady = Boolean(item.parsedTower && item.parsedFlat && typeof item.amount === 'number' && item.amount > 0);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setActiveIndex(index)}
                                        className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-50/60 border-blue-500 shadow-md ring-1 ring-blue-500'
                                                : duplicateInfo.isDuplicate
                                                ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                                                : isReady
                                                ? 'bg-white border-slate-200 hover:border-slate-300'
                                                : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                            {/* Thumbnail & Index */}
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-12 h-12 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-300 group">
                                                    <img
                                                        src={item.imageData}
                                                        alt="Receipt thumbnail"
                                                        style={{ transform: `rotate(${item.rotation}deg)` }}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                        <ZoomIn className="w-4 h-4" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-800">
                                                            #{index + 1}
                                                        </span>
                                                        {item.parsedTower && item.parsedFlat ? (
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-md">
                                                                Tower {item.parsedTower} - Flat {item.parsedFlat}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-md">
                                                                Enter Flat
                                                            </span>
                                                        )}
                                                        {isReady && !duplicateInfo.isDuplicate && (
                                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                                <Check className="w-3 h-3 text-emerald-600" /> Ready
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                                        {item.fileName}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete / Remove Action */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteBatchItem(item.id);
                                                }}
                                                title="Delete / Discard this receipt"
                                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Duplicate Warning Box */}
                                        {duplicateInfo.isDuplicate && (
                                            <div className="mb-3 p-2.5 bg-amber-100/80 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                                    <span>{duplicateInfo.message}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteBatchItem(item.id);
                                                    }}
                                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded transition-colors"
                                                >
                                                    Discard Duplicate
                                                </button>
                                            </div>
                                        )}

                                        {/* Row Inputs Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                                            {/* Combined Tower + Flat input */}
                                            <div className="lg:col-span-2">
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                    Tower + Flat <span className="text-slate-400 font-normal">(e.g. 421105, 42-1105, A-101)</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        ref={(el) => (rowInputRefs.current[item.id] = el)}
                                                        type="text"
                                                        value={item.combinedTowerFlat}
                                                        onChange={(e) => updateBatchItem(item.id, { combinedTowerFlat: e.target.value })}
                                                        placeholder="421105 or 42-1105"
                                                        className={`w-full px-3 py-1.5 text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 ${
                                                            duplicateInfo.isDuplicate
                                                                ? 'border-amber-400 bg-amber-50 focus:ring-amber-500'
                                                                : item.parsedTower && item.parsedFlat
                                                                ? 'border-emerald-300 bg-emerald-50/40 focus:ring-blue-500'
                                                                : 'border-slate-300 bg-white focus:ring-blue-500'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                    Amount (₹) <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => updateBatchItem(item.id, { amount: e.target.value === '' ? '' : Number(e.target.value) })}
                                                    placeholder="2500"
                                                    className="w-full px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Food Coupons */}
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                    Coupons (0-4)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="4"
                                                    value={item.numberOfCoupons}
                                                    onChange={(e) => updateBatchItem(item.id, { numberOfCoupons: Math.min(4, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                                                    className="w-full px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Payment Mode */}
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                    Mode
                                                </label>
                                                <select
                                                    value={item.paymentType}
                                                    onChange={(e) => updateBatchItem(item.id, { paymentType: e.target.value as any })}
                                                    className="w-full px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="Online">Online</option>
                                                    <option value="Cheque">Cheque</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Preview Modal */}
            {fullscreenImage && (
                <ImageViewerModal
                    imageUrl={fullscreenImage}
                    onClose={() => setFullscreenImage(null)}
                />
            )}
        </div>
    );
};

export default PaperReceiptsPage;
