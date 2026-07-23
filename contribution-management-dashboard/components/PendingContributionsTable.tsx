import React from 'react';
import type { Contribution } from '../types/index';
import { Check, X, Eye, Clock, Building2, User, Phone, Image as ImageIcon } from 'lucide-react';

interface PendingContributionsTableProps {
    pendingContributions: Contribution[];
    campaignMap: Map<number, string>;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    onViewImage?: (url: string) => void;
}

export const PendingContributionsTable: React.FC<PendingContributionsTableProps> = ({
    pendingContributions,
    campaignMap,
    onApprove,
    onReject,
    onViewImage,
}) => {
    if (pendingContributions.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold text-base">No pending contributions awaiting approval</p>
                <p className="text-slate-400 text-sm mt-1">When donors submit new contributions from their portal, they will appear here for review.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-amber-100/70 text-amber-900 font-bold text-xs uppercase tracking-wider border-b border-amber-200">
                    <tr>
                        <th className="p-3.5">Donor Info</th>
                        <th className="p-3.5">Tower & Flat</th>
                        <th className="p-3.5">Campaign</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Receipt / Proof</th>
                        <th className="p-3.5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 bg-white">
                    {pendingContributions.map((c) => {
                        const campaignName = (c.campaignId && campaignMap.get(c.campaignId)) || c.type || 'General Donation';
                        return (
                            <tr key={c.id} className="hover:bg-amber-50/50 transition-colors">
                                <td className="p-3.5">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                                        {c.donorName}
                                    </div>
                                    {c.mobileNumber && (
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                            {c.mobileNumber}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
                                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                        T-{c.towerNumber} / F-{c.flatNumber}
                                    </span>
                                </td>
                                <td className="p-3.5 font-medium text-slate-800">
                                    {campaignName}
                                </td>
                                <td className="p-3.5 font-extrabold text-emerald-700 text-base">
                                    ₹{Number(c.amount).toLocaleString()}
                                </td>
                                <td className="p-3.5 text-xs text-slate-500">
                                    {new Date(c.date).toLocaleDateString()}
                                </td>
                                <td className="p-3.5">
                                    {c.image ? (
                                        <button
                                            type="button"
                                            onClick={() => onViewImage && onViewImage(c.image!)}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                                        >
                                            <ImageIcon className="w-3.5 h-3.5" /> View Proof
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No file attached</span>
                                    )}
                                </td>
                                <td className="p-3.5 text-right space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => onApprove(c.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all duration-150"
                                        title="Approve and record as official contribution"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onReject(c.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 font-semibold text-xs rounded-lg transition-all duration-150"
                                        title="Reject contribution entry"
                                    >
                                        <X className="w-4 h-4" /> Reject
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
