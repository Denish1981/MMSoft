import React, { useState } from 'react';
import type { Contribution } from '../types/index';
import { ContributionStatusBadge } from './ContributionStatusBadge';
import { SparklesIcon } from './icons/SparklesIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';
import { formatReceiptNo, ReceiptData } from '../utils/receiptUtils';
import { ReceiptModal } from './ReceiptModal';
import { Receipt as ReceiptIcon, Check, X, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface ContributionsTableProps {
    activeTab: 'individual' | 'miscellaneous';
    paginatedContributions: Contribution[];
    campaignMap: Map<number, string>;
    festivalMap?: Map<number, string>;
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
    festivalMap,
    onGenerateNote,
    onViewHistory,
    onEdit,
    onDelete,
    onViewImage,
    totalContributionsCount,
}) => {
    const { hasPermission } = useAuth();
    const { handleUpdateContributionTransactionRef } = useData();
    const isManager = hasPermission('action:edit') || hasPermission('action:users:manage');

    const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
    const [editingUtrId, setEditingUtrId] = useState<number | null>(null);
    const [utrValue, setUtrValue] = useState<string>('');
    const [isSavingUtr, setIsSavingUtr] = useState(false);
    const [savedSuccessId, setSavedSuccessId] = useState<number | null>(null);

    const startEditingUtr = (contribution: Contribution) => {
        if (!isManager) return;
        setEditingUtrId(contribution.id);
        setUtrValue(contribution.transactionRef || '');
    };

    const cancelEditingUtr = () => {
        setEditingUtrId(null);
        setUtrValue('');
    };

    const handleSaveUtr = async (id: number) => {
        try {
            setIsSavingUtr(true);
            await handleUpdateContributionTransactionRef(id, utrValue.trim() || null);
            setIsSavingUtr(false);
            setEditingUtrId(null);
            setSavedSuccessId(id);
            setTimeout(() => {
                setSavedSuccessId(prev => prev === id ? null : prev);
            }, 2500);
        } catch (err) {
            setIsSavingUtr(false);
        }
    };

    const handleUtrKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveUtr(id);
        } else if (e.key === 'Escape') {
            cancelEditingUtr();
        }
    };

    const openReceipt = (contribution: Contribution) => {
        const cat = activeTab === 'miscellaneous' || contribution.type === 'Miscellaneous' || contribution.type?.startsWith('Miscellaneous:') ? 'misc' : 'contribution';
        const rData: ReceiptData = {
            receiptNo: formatReceiptNo(contribution.id, cat),
            category: cat,
            title: cat === 'misc' ? 'Miscellaneous Income' : 'Individual Contribution',
            date: contribution.date,
            payerName: contribution.donorName,
            payerEmail: contribution.donorEmail,
            payerPhone: contribution.mobileNumber,
            towerNumber: contribution.towerNumber,
            flatNumber: contribution.flatNumber,
            amount: Number(contribution.amount),
            paymentMode: contribution.type || undefined,
            festivalOrCampaign: (contribution.festivalId && festivalMap?.get(contribution.festivalId)) || (contribution.campaignId && campaignMap.get(contribution.campaignId)) || 'General Campaign',
            status: contribution.status || 'Completed',
            details: [
                ...(contribution.transactionRef ? [{ label: 'Transaction / UTR Ref', value: contribution.transactionRef }] : []),
                { label: 'Coupons Issued', value: String(contribution.numberOfCoupons || 0) },
                { label: 'Payment Type', value: contribution.type || 'N/A' },
            ]
        };
        setSelectedReceipt(rData);
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            {activeTab === 'miscellaneous' ? 'Name / Source' : 'Donor'}
                        </th>
                        {activeTab === 'individual' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Tower - Flat
                            </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                        {activeTab === 'individual' && (
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Coupons</th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Festival / Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedContributions.length > 0 ? (
                        paginatedContributions.map(contribution => {
                            const towerFlat = contribution.towerNumber && contribution.flatNumber
                                ? `${contribution.towerNumber}-${contribution.flatNumber}`
                                : (contribution.towerNumber || contribution.flatNumber || 'N/A');

                            return (
                                <tr key={contribution.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{contribution.donorName}</div>
                                        {contribution.donorEmail && <div className="text-xs text-slate-500">{contribution.donorEmail}</div>}
                                    </td>
                                    {activeTab === 'individual' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                                            {towerFlat}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{formatCurrency(contribution.amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                                        <div>{contribution.type || 'N/A'}</div>
                                        {editingUtrId === contribution.id ? (
                                            <div className="flex items-center gap-1 mt-1 justify-center max-w-[200px] mx-auto">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={utrValue}
                                                    onChange={e => setUtrValue(e.target.value)}
                                                    onKeyDown={e => handleUtrKeyDown(e, contribution.id)}
                                                    placeholder="UTR Ref..."
                                                    disabled={isSavingUtr}
                                                    className="w-28 px-1.5 py-0.5 border border-blue-500 rounded text-xs font-mono bg-white focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => handleSaveUtr(contribution.id)}
                                                    disabled={isSavingUtr}
                                                    className="p-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                                                    title="Save UTR (Enter)"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={cancelEditingUtr}
                                                    disabled={isSavingUtr}
                                                    className="p-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded"
                                                    title="Cancel (Esc)"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => isManager && startEditingUtr(contribution)}
                                                className={`group inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded mt-0.5 max-w-[150px] truncate transition ${
                                                    savedSuccessId === contribution.id
                                                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                                                        : contribution.transactionRef
                                                        ? 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-900 cursor-pointer'
                                                        : isManager
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-dashed border-amber-300 cursor-pointer'
                                                        : 'text-slate-400'
                                                }`}
                                                title={isManager ? "Click to quick edit UTR / Bank Reference" : contribution.transactionRef || undefined}
                                            >
                                                {savedSuccessId === contribution.id ? (
                                                    <span>✓ Saved!</span>
                                                ) : contribution.transactionRef ? (
                                                    <>
                                                        <span className="truncate">Ref: {contribution.transactionRef}</span>
                                                        {isManager && <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 shrink-0 text-blue-600" />}
                                                    </>
                                                ) : isManager ? (
                                                    <>
                                                        <span>+ UTR</span>
                                                        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 shrink-0" />
                                                    </>
                                                ) : null}
                                            </div>
                                        )}
                                    </td>
                                    {activeTab === 'individual' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{contribution.numberOfCoupons}</td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {(contribution.festivalId && festivalMap?.get(contribution.festivalId)) || (contribution.campaignId && campaignMap.get(contribution.campaignId)) || 'N/A'}
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
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => openReceipt(contribution)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors" title="View / Download Receipt">
                                                <ReceiptIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onGenerateNote(contribution)} className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded transition-colors" title="Generate Thank You Note">
                                               <SparklesIcon className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => onViewHistory(contribution)} className="text-slate-500 hover:text-blue-600 p-1 hover:bg-slate-100 rounded transition-colors" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onEdit(contribution)} className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors" title="Edit Contribution">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDelete(contribution.id)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors" title="Delete Contribution">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={activeTab === 'individual' ? 10 : 8} className="text-center py-10 text-slate-500">
                                {totalContributionsCount === 0 ? "No contributions have been added yet." : "No contributions match your current filters."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        </div>
    );
};
