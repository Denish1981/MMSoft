import React, { useState } from 'react';
import { type StagedContribution } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import { SaveIcon } from '../components/icons/SaveIcon';
import { API_URL } from '../config';
import { useData } from '../contexts/DataContext';
import { BulkAddForm } from '../components/BulkAddForm';
import { StagedContributionsTable } from '../components/StagedContributionsTable';

interface BulkAddPageProps {}

const BulkAddPage: React.FC<BulkAddPageProps> = () => {
    const { token, logout } = useAuth();
    const { fetchData: onBulkSaveSuccess } = useData();
    const [stagedContributions, setStagedContributions] = useState<StagedContribution[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleAddToList = (contribution: StagedContribution) => {
        setStagedContributions((prev) => [...prev, contribution]);
    };

    const handleRemoveFromList = (index: number) => {
        setStagedContributions((prev) => prev.filter((_, i) => i !== index));
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
            
            setSuccessMessage(`${stagedContributions.length} contributions saved successfully!`);
            setStagedContributions([]);
            onBulkSaveSuccess(); // This will trigger a re-fetch in App.tsx

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Action Header */}
            <div className="bg-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-lg font-semibold text-slate-800">Stage & Save Contributions</h2>
                    <p className="text-sm text-slate-500">Add contributions to the list below, then save all at once.</p>
                </div>
                 <button
                    onClick={handleSaveAll}
                    disabled={isLoading || stagedContributions.length === 0}
                    className="flex items-center justify-center w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Saving...' : <><SaveIcon className="w-5 h-5 mr-2" /> Save All ({stagedContributions.length})</>}
                </button>
            </div>
            
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p>{error}</p></div>}
            {successMessage && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md" role="alert"><p>{successMessage}</p></div>}

            {/* Form Card */}
            <BulkAddForm onAddToList={handleAddToList} setError={setError} />

            {/* Staged Contributions Table */}
            <StagedContributionsTable stagedContributions={stagedContributions} onRemoveFromList={handleRemoveFromList} />
        </div>
    );
};

export default BulkAddPage;
