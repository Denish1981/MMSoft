import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Festival } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { PhotoIcon } from '../components/icons/PhotoIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';
import { StoreIcon } from '../components/icons/StoreIcon';
import { formatUTCDate } from '../utils/formatting';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

const Festivals: React.FC = () => {
    const { festivals, campaigns } = useData();
    const { openFestivalModal, openConfirmationModal, openHistoryModal } = useModal();
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');

    const campaignMap = useMemo(() => new Map(campaigns.map(c => [c.id, c.name])), [campaigns]);

    const filteredFestivals = useMemo(() => {
        if (selectedCampaignId === 'all') {
            return festivals;
        }
        const campaignId = Number(selectedCampaignId);
        return festivals.filter(f => f.campaignId === campaignId);
    }, [festivals, selectedCampaignId]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Festivals Management</h2>
            
            <div className="mb-6">
                <label htmlFor="campaign-filter" className="block text-sm font-medium text-slate-700">Filter by Campaign</label>
                <select
                    id="campaign-filter"
                    value={selectedCampaignId}
                    onChange={e => setSelectedCampaignId(e.target.value)}
                    className="mt-1 block w-full md:w-1/3 px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Campaigns</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
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
                        {filteredFestivals.map(festival => (
                            <tr key={festival.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <div className="text-sm font-medium text-slate-900">{festival.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    {(festival.campaignId && campaignMap.get(festival.campaignId)) || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    {formatUTCDate(festival.startDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    {formatUTCDate(festival.endDate)}
                                </td>
                                 <td className="px-6 py-4 text-sm text-slate-500 align-top max-w-sm">
                                    <p className="truncate" title={festival.description || ''}>{festival.description || 'N/A'}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium align-top">
                                    <div className="flex items-center space-x-4">
                                        <Link to={`/festivals/${festival.id}/events`} className="text-blue-600 hover:text-blue-900" title="Manage Events">
                                            <CalendarDaysIcon className="w-4 h-4" />
                                        </Link>
                                         <Link to={`/festivals/${festival.id}/stall-registrations`} className="text-green-600 hover:text-green-900" title="Manage Stalls">
                                            <StoreIcon className="w-4 h-4" />
                                        </Link>
                                        <Link to={`/festivals/${festival.id}/photos`} className="text-purple-600 hover:text-purple-900" title="Manage Photos">
                                            <PhotoIcon className="w-4 h-4" />
                                        </Link>
                                        <button onClick={() => openHistoryModal('festivals', festival.id, `History for ${festival.name}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                            <HistoryIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openFestivalModal(festival)} className="text-slate-600 hover:text-slate-900" title="Edit Festival">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openConfirmationModal(festival.id, 'festivals')} className="text-red-600 hover:text-red-900" title="Delete Festival">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredFestivals.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <p>{festivals.length === 0 ? "No festivals found." : "No festivals match your current filter."}</p>
                        {festivals.length === 0 && <p className="text-sm">Click "Add Festival" to get started.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Festivals;