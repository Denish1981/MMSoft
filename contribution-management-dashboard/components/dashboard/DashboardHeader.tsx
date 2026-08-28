import React from 'react';
import { Link } from 'react-router-dom';
import { HelpIcon } from '../icons/HelpIcon';
import { PlusIcon } from '../icons/PlusIcon';
import type { Campaign } from '../../types/index';

interface DashboardHeaderProps {
    selectedCampaignId: string;
    setSelectedCampaignId: (id: string) => void;
    setSelectedFestivalId: (id: string) => void;
    campaigns: Campaign[];
    isManager?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    selectedCampaignId,
    setSelectedCampaignId,
    setSelectedFestivalId,
    campaigns,
    isManager = false,
}) => {
    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
            <div>
                <h2 className="text-lg font-bold text-slate-800 font-sans tracking-tight">Operational & Financial Overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">Setup campaigns, record donations, monitor expenses, and manage festivals.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {isManager && (
                    <Link
                        to="/bulk-add"
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                        title="Quickly record multiple offline door-to-door contributions"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Bulk Add</span>
                    </Link>
                )}
                <Link 
                    to="/documentation" 
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg border border-blue-200 transition-colors"
                >
                    <HelpIcon className="w-4 h-4" />
                    <span>System Guide</span>
                </Link>
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-500">Filter Campaign:</span>
                    <select
                        value={selectedCampaignId}
                        onChange={(e) => {
                            setSelectedCampaignId(e.target.value);
                            setSelectedFestivalId('all'); // Reset festival filter when campaign changes
                        }}
                        className="text-xs p-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Filter by campaign"
                    >
                        <option value="all">All Campaigns</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.financialYear})</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
