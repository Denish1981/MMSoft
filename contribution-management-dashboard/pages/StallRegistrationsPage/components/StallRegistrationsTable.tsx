import React from 'react';
// FIX: Corrected the import path for StallRegistration to point directly to its source file, resolving the module export issue.
import type { StallRegistration } from '../../../types/participants';
import { formatUTCDate, formatCurrency } from '../../../utils/formatting';
import { CheckSquareIcon } from '../../../components/icons/CheckSquareIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { DeleteIcon } from '../../../components/icons/DeleteIcon';
import StatusBadge from './StatusBadge';

interface StallRegistrationsTableProps {
    registrations: StallRegistration[];
    onApprove: (reg: StallRegistration) => void;
    onReject: (reg: StallRegistration) => void;
    onDelete: (id: number) => void;
    onViewImage: (url: string) => void;
    canReview: boolean;
    canDelete: boolean;
}

const StallRegistrationsTable: React.FC<StallRegistrationsTableProps> = ({ registrations, onApprove, onReject, onDelete, onViewImage, canReview, canDelete }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registrant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Products</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        {(canReview || canDelete) && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {registrations.map(reg => (
                        <tr key={reg.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap align-top">
                                <div className="text-sm font-medium text-slate-900">{reg.registrantName}</div>
                                <div className="text-sm text-slate-500">{reg.contactNumber}</div>
                            </td>
                            <td className="px-6 py-4 align-top text-sm text-slate-500 max-w-xs">
                                <div className="flex flex-wrap gap-1">
                                    {reg.stallDates.map(d => (
                                        <span key={d} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs">
                                            {formatUTCDate(d)}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4 align-top text-sm text-slate-500 max-w-xs">
                                <ul className="list-disc list-inside">
                                    {reg.products.map((p, i) => <li key={i}>{p.productName} ({formatCurrency(p.price)})</li>)}
                                </ul>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-top text-center text-sm text-slate-500">
                                <div>Tables: <strong>{reg.numberOfTables}</strong></div>
                                <div>Electricity: <strong>{reg.needsElectricity ? 'Yes' : 'No'}</strong></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                <div className="text-sm font-semibold text-slate-800">{formatCurrency(reg.totalPayment)}</div>
                                <img src={reg.paymentScreenshot} alt="Payment" className="mt-1 h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform ml-auto" onClick={() => onViewImage(reg.paymentScreenshot)} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-top">
                                <StatusBadge status={reg.status} />
                                {reg.status !== 'Pending' && reg.reviewedBy && (
                                    <div className="text-xs text-slate-500 mt-1">
                                        by {reg.reviewedBy} on {formatUTCDate(reg.reviewedAt, {dateStyle: 'short', timeStyle: 'short'})}
                                    </div>
                                )}
                                {reg.status === 'Rejected' && reg.rejectionReason && (
                                    <div className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={reg.rejectionReason}>
                                        Reason: {reg.rejectionReason}
                                    </div>
                                )}
                            </td>
                            {(canReview || canDelete) && (
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                    <div className="flex items-center justify-end gap-2">
                                        {reg.status === 'Pending' && canReview && (
                                            <>
                                                <button onClick={() => onApprove(reg)} className="p-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200" title="Approve"><CheckSquareIcon className="w-4 h-4"/></button>
                                                <button onClick={() => onReject(reg)} className="p-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200" title="Reject"><CloseIcon className="w-4 h-4"/></button>
                                            </>
                                        )}
                                        {canDelete && (
                                            <button onClick={() => onDelete(reg.id)} className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200" title="Delete Registration">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StallRegistrationsTable;