import React from 'react';
import type { StagedContribution } from '../types/index';
import { ContributionStatusBadge } from './ContributionStatusBadge';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency } from '../utils/formatting';

interface StagedContributionsTableProps {
    stagedContributions: StagedContribution[];
    onRemoveFromList: (index: number) => void;
}

export const StagedContributionsTable: React.FC<StagedContributionsTableProps> = ({
    stagedContributions,
    onRemoveFromList,
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Staged Contributions ({stagedContributions.length})</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Donor</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Residence</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Coupons</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {stagedContributions.map((c, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.donorName}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{`T-${c.towerNumber}, F-${c.flatNumber}`}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold text-right">{formatCurrency(c.amount)}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{c.numberOfCoupons}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                                    <ContributionStatusBadge status={c.status} />
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    {c.image ? (
                                        <img src={c.image} alt="Staged thumbnail" className="h-10 w-16 object-cover rounded-md mx-auto" />
                                    ) : (
                                        <span className="text-slate-400 text-xs">N/A</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <button onClick={() => onRemoveFromList(index)} className="text-red-600 hover:text-red-900" title="Remove">
                                        <DeleteIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {stagedContributions.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-slate-500">No contributions have been added to the list yet.</p>
                        <p className="text-sm text-slate-400">Use the form above to add contributions.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
