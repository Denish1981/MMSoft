import React, { useState, useEffect } from 'react';
import { Contribution, type StagedContribution } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import { SaveIcon } from '../components/icons/SaveIcon';
import { API_URL } from '../config';
import { useData } from '../contexts/DataContext';
import { BulkAddForm } from '../components/BulkAddForm';
import { StagedContributionsTable } from '../components/StagedContributionsTable';

interface BulkAddPageProps {}

const BulkAddPage: React.FC<BulkAddPageProps> = () => {
    const { token, logout } = useAuth();
    const { setContributions, campaigns } = useData();
    const [stagedContributions, setStagedContributions] = useState<StagedContribution[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Default campaign to active campaign or first available
    useEffect(() => {
        if (campaigns.length > 0 && selectedCampaignId === null) {
            const active = campaigns.find(c => c.isActive) || campaigns[0];
            if (active) {
                setSelectedCampaignId(active.id);
            }
        }
    }, [campaigns, selectedCampaignId]);

    const handleAddToList = (contribution: StagedContribution) => {
        // Ensure the global default campaign is attached
        const itemToAdd: StagedContribution = {
            ...contribution,
            campaignId: selectedCampaignId ?? contribution.campaignId,
        };
        setStagedContributions((prev) => [...prev, itemToAdd]);
    };

    const handleRemoveFromList = (index: number) => {
        setStagedContributions((prev) => prev.filter((_, i) => i !== index));
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
        if (stagedContributions.length === 0) return;
        
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

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
            setSuccessMessage(`${stagedContributions.length} contributions saved successfully!`);
            setStagedContributions([]);

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setTimeout(() => setSuccessMessage(''), 5000);
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

                <div className="flex items-center justify-end">
                    <button
                        onClick={handleSaveAll}
                        disabled={isLoading || stagedContributions.length === 0 || !selectedCampaignId}
                        className="flex items-center justify-center w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium"
                    >
                        {isLoading ? 'Saving...' : <><SaveIcon className="w-5 h-5 mr-2" /> Save All ({stagedContributions.length})</>}
                    </button>
                </div>
            </div>
            
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
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
