import React, { useState, useEffect } from 'react';
import { Contribution, type StagedContribution } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import { SaveIcon } from '../components/icons/SaveIcon';
import { API_URL } from '../config';
import { useData } from '../contexts/DataContext';
import { BulkAddForm } from '../components/BulkAddForm';
import { StagedContributionsTable } from '../components/StagedContributionsTable';

interface BulkAddPageProps {}

const STORAGE_KEY_STAGED = 'gtmm_bulk_add_staged_contributions';
const STORAGE_KEY_CAMPAIGN = 'gtmm_bulk_add_selected_campaign_id';

const BulkAddPage: React.FC<BulkAddPageProps> = () => {
    const { token, logout } = useAuth();
    const { setContributions, campaigns } = useData();
    const [stagedContributions, setStagedContributions] = useState<StagedContribution[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_STAGED);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('Error loading staged contributions from localStorage:', e);
        }
        return [];
    });

    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CAMPAIGN);
            if (saved) {
                const num = Number(saved);
                if (!isNaN(num) && num > 0) return num;
            }
        } catch (e) {
            console.error('Error loading campaign from localStorage:', e);
        }
        return null;
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [warningMessage, setWarningMessage] = useState('');

    // Default campaign to active campaign or first available if not already in localStorage
    useEffect(() => {
        if (campaigns.length > 0) {
            const campaignExists = campaigns.some(c => c.id === selectedCampaignId);
            if (!campaignExists) {
                const active = campaigns.find(c => c.isActive) || campaigns[0];
                if (active) {
                    setSelectedCampaignId(active.id);
                    localStorage.setItem(STORAGE_KEY_CAMPAIGN, String(active.id));
                }
            }
        }
    }, [campaigns, selectedCampaignId]);

    // Persist staged contributions to localStorage whenever they change
    useEffect(() => {
        try {
            if (stagedContributions.length > 0) {
                localStorage.setItem(STORAGE_KEY_STAGED, JSON.stringify(stagedContributions));
            } else {
                localStorage.removeItem(STORAGE_KEY_STAGED);
            }
        } catch (e) {
            console.error('Error saving staged contributions to localStorage:', e);
        }
    }, [stagedContributions]);

    // Persist campaign selection to localStorage
    useEffect(() => {
        try {
            if (selectedCampaignId) {
                localStorage.setItem(STORAGE_KEY_CAMPAIGN, String(selectedCampaignId));
            }
        } catch (e) {
            console.error('Error saving campaign to localStorage:', e);
        }
    }, [selectedCampaignId]);

    const handleAddToList = (contribution: StagedContribution) => {
        setError('');
        setWarningMessage('');

        // Ensure the global default campaign is attached
        const itemToAdd: StagedContribution = {
            ...contribution,
            campaignId: selectedCampaignId ?? contribution.campaignId,
        };

        // Duplicate check within currently staged list
        const isDuplicateInBatch = stagedContributions.some(
            existing => 
                existing.towerNumber === itemToAdd.towerNumber &&
                existing.flatNumber === itemToAdd.flatNumber &&
                existing.campaignId === itemToAdd.campaignId
        );

        if (isDuplicateInBatch) {
            const confirmAdd = window.confirm(
                `Warning: Tower ${itemToAdd.towerNumber} Flat ${itemToAdd.flatNumber} is already in your staged list.\n\nDo you want to add another contribution for this flat?`
            );
            if (!confirmAdd) {
                return;
            }
        }

        setStagedContributions((prev) => [...prev, itemToAdd]);
    };

    const handleRemoveFromList = (index: number) => {
        setStagedContributions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAllStaged = () => {
        if (stagedContributions.length === 0) return;
        if (window.confirm('Are you sure you want to clear all staged contributions? This cannot be undone.')) {
            setStagedContributions([]);
            localStorage.removeItem(STORAGE_KEY_STAGED);
        }
    };

    // If campaign selection at top changes, update all existing staged contributions too
    const handleCampaignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCampaignId = e.target.value ? Number(e.target.value) : null;
        setSelectedCampaignId(newCampaignId);
        if (newCampaignId !== null) {
            setStagedContributions((prev) =>
                prev.map((c) => ({
                    ...c,
                    campaignId: newCampaignId,
                }))
            );
        }
    };

    const handleSaveAll = async () => {
        if (stagedContributions.length === 0 || isLoading) return;
        
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        setWarningMessage('');

        try {
            const response = await fetch(`${API_URL}/contributions/bulk`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ contributions: stagedContributions }),
            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save contributions`);
            }
            
            const savedItems: Contribution[] = await response.json();
            setContributions((prev) => [...savedItems, ...prev]);
            
            const count = stagedContributions.length;
            // Clear staged state and remove from localStorage atomically on success
            setStagedContributions([]);
            localStorage.removeItem(STORAGE_KEY_STAGED);

            setSuccessMessage(`${count} contribution${count > 1 ? 's' : ''} saved successfully to the database!`);

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setTimeout(() => setSuccessMessage(''), 6000);
        }
    };

    const selectedCampaignObj = campaigns.find(c => c.id === selectedCampaignId);

    return (
        <div className="space-y-6">
            {/* Top Bar: Global Campaign Selector & Save All Action */}
            <div className="bg-white p-5 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border border-slate-100">
                <div className="flex-1 max-w-xl">
                    <label htmlFor="topCampaignSelect" className="block text-sm font-semibold text-slate-800 mb-1">
                        Default Campaign for Staged Contributions <span className="text-rose-500">*</span>
                    </label>
                    <select
                        id="topCampaignSelect"
                        value={selectedCampaignId ?? ''}
                        onChange={handleCampaignChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        required
                    >
                        <option value="" disabled>Select Default Campaign</option>
                        {campaigns.map((camp) => (
                            <option key={camp.id} value={camp.id}>
                                {camp.name} {camp.isActive ? '(Active)' : ''}
                            </option>
                        ))}
                    </select>
                    {selectedCampaignObj && (
                        <p className="mt-1 text-xs text-slate-500">
                            All contributions added will default to <strong className="text-blue-600 font-medium">{selectedCampaignObj.name}</strong>.
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    {stagedContributions.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAllStaged}
                            disabled={isLoading}
                            className="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors disabled:opacity-50"
                        >
                            Clear Staged ({stagedContributions.length})
                        </button>
                    )}
                    <button
                        onClick={handleSaveAll}
                        disabled={isLoading || stagedContributions.length === 0 || !selectedCampaignId}
                        className="flex items-center justify-center w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            <><SaveIcon className="w-5 h-5 mr-2" /> Save All ({stagedContributions.length})</>
                        )}
                    </button>
                </div>
            </div>

            {/* LocalStorage persistence info badge */}
            {stagedContributions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span>💾</span>
                        <span>Auto-saved to your browser. You will not lose your {stagedContributions.length} staged entries if you refresh or switch tabs.</span>
                    </span>
                    <span className="text-blue-600 font-semibold">{stagedContributions.length} items</span>
                </div>
            )}
            
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
            {warningMessage && <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-md" role="alert"><p>{warningMessage}</p></div>}
            {successMessage && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md" role="alert"><p>{successMessage}</p></div>}

            {/* Form Card */}
            <BulkAddForm 
                defaultCampaignId={selectedCampaignId} 
                onAddToList={handleAddToList} 
                setError={setError} 
            />

            {/* Staged Contributions Table */}
            <StagedContributionsTable stagedContributions={stagedContributions} onRemoveFromList={handleRemoveFromList} />
        </div>
    );
};

export default BulkAddPage;
