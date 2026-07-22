import React from 'react';
import type { Contribution } from '../types/index';
import { ContributionStatusBadge } from './ContributionStatusBadge';
import { SparklesIcon } from './icons/SparklesIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';

interface ContributionsTableProps {
    activeTab: 'individual' | 'miscellaneous';
    paginatedContributions: Contribution[];
    campaignMap: Map<number, string>;
    onGenerateNote: (contribution: Contribution) => void;
    onViewHistory: (contribution: Contribution) => void;
    onEdit: (contribution: Contribution) => void;
    onDelete: (contributionId: number) => void;
    onViewImage: (imageUrl: string) => void;
    totalContributionsCount: number;
}

export const ContributionsTable: React.FC<ContributionsTableProps> = ({
    activeTab,
    paginatedContributions,
    campaignMap,
    onGenerateNote,
    onViewHistory,
    onEdit,
    onDelete,
    onViewImage,
    totalContributionsCount,
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            {activeTab === 'miscellaneous' ? 'Name / Source' : 'Donor'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                        {activeTab === 'individual' && (
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Coupons</th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedContributions.length > 0 ? (
                        paginatedContributions.map(contribution => (
                            <tr key={contribution.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">{contribution.donorName}</div>
                                    {contribution.donorEmail && <div className="text-sm text-slate-500">{contribution.donorEmail}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{formatCurrency(contribution.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{contribution.type}</td>
                                {activeTab === 'individual' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{contribution.numberOfCoupons}</td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {(contribution.campaignId && campaignMap.get(contribution.campaignId)) || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(contribution.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {contribution.image ? (
                                        <img 
                                            src={contribution.image} 
                                            alt="Contribution" 
                                            className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform mx-auto"
                                            onClick={() => onViewImage(contribution.image!)}
                                        />
                                    ) : (
                                        <span className="text-slate-400 text-xs">N/A</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <ContributionStatusBadge status={contribution.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => onGenerateNote(contribution)} className="text-blue-600 hover:text-blue-800 flex items-center" title="Generate Thank You Note">
                                           <SparklesIcon className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => onViewHistory(contribution)} className="text-slate-500 hover:text-blue-600" title="View History">
                                            <HistoryIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onEdit(contribution)} className="text-slate-600 hover:text-slate-900" title="Edit Contribution">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(contribution.id)} className="text-red-600 hover:text-red-900" title="Delete Contribution">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={activeTab === 'individual' ? 9 : 8} className="text-center py-10 text-slate-500">
                                {totalContributionsCount === 0 ? "No contributions have been added yet." : "No contributions match your current filters."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
