
import React, { useMemo } from 'react';
import type { Festival, Campaign } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';

interface FestivalsProps {
    festivals: Festival[];
    campaigns: Campaign[];
    onEdit: (festival: Festival) => void;
    onDelete: (id: string) => void;
}

const Festivals: React.FC<FestivalsProps> = ({ festivals, campaigns, onEdit, onDelete }) => {
    const campaignMap = useMemo(() => new Map(campaigns.map(c => [c.id, c.name])), [campaigns]);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Festivals Management</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Festival Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Start Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">End Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {festivals.map(festival => (
                            <tr key={festival.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <div className="text-sm font-medium text-slate-900">{festival.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    {(festival.campaignId && campaignMap.get(festival.campaignId)) || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    {formatDate(festival.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    {formatDate(festival.endDate)}
                                </td>
                                 <td className="px-6 py-4 text-sm text-slate-500 align-top max-w-sm">
                                    <p className="truncate" title={festival.description || ''}>{festival.description || 'N/A'}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium align-top">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => onEdit(festival)} className="text-slate-600 hover:text-slate-900" title="Edit Festival">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(festival.id)} className="text-red-600 hover:text-red-900" title="Delete Festival">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {festivals.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <p>No festivals found.</p>
                        <p className="text-sm">Click "Add Festival" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Festivals;