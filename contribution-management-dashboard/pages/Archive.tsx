
import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import type { ArchivedItem } from '../types';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { ArchiveIcon } from '../components/icons/ArchiveIcon';

interface ArchivePageProps {
    onRestore: (recordType: string, recordId: number) => void;
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

const RestoreIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const ArchivePage: React.FC<ArchivePageProps> = ({ onRestore, onViewHistory }) => {
    const { token, logout } = useAuth();
    const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchArchivedItems = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_URL}/archive`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401) {
                    logout();
                    return;
                }
                if (!response.ok) {
                    throw new Error('Failed to fetch archived items.');
                }
                const data: ArchivedItem[] = await response.json();
                setArchivedItems(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchArchivedItems();
    }, [token, logout]);
    
    const formatType = (type: string) => {
        if (!type) return 'Unknown';
        return type.charAt(0).toUpperCase() + type.slice(1, -1); // "contributions" -> "Contribution"
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading archived items...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Archived Records</h2>
            <p className="text-sm text-slate-500 mb-6">
                These items have been removed from the main application but are preserved here. They can be restored at any time.
            </p>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Record Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Archived</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {archivedItems.map((item) => (
                            <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatType(item.type)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(item.deletedAt).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <div className="flex items-center justify-center space-x-4">
                                        <button 
                                            onClick={() => onRestore(item.type, item.id)}
                                            className="flex items-center text-green-600 hover:text-green-800" 
                                            title="Restore Item"
                                        >
                                            <RestoreIcon className="w-4 h-4 mr-1" /> Restore
                                        </button>
                                        <button 
                                            onClick={() => onViewHistory(item.type, item.id, `History for ${item.name}`)} 
                                            className="text-slate-500 hover:text-blue-600" 
                                            title="View History"
                                        >
                                            <HistoryIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {archivedItems.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <ArchiveIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <p className="text-lg font-semibold">The Archive is Empty</p>
                        <p className="text-sm">When you delete items, they will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchivePage;
