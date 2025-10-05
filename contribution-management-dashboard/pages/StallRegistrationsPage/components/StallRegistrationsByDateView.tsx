import React from 'react';
import type { StallRegistration } from '../../../types/index';
import { formatUTCDate, formatCurrency } from '../../../utils/formatting';
import { CheckSquareIcon } from '../../../components/icons/CheckSquareIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { DeleteIcon } from '../../../components/icons/DeleteIcon';
import StatusBadge from './StatusBadge';

interface StallRegistrationsByDateViewProps {
    allStallDates: string[];
    registrationsByDate: Map<string, StallRegistration[]>;
    maxStalls?: number | null;
    onApprove: (reg: StallRegistration) => void;
    onReject: (reg: StallRegistration) => void;
    onDelete: (id: number) => void;
    onViewImage: (url: string) => void;
    canReview: boolean;
    canDelete: boolean;
}

const StallRegistrationsByDateView: React.FC<StallRegistrationsByDateViewProps> = ({
    allStallDates,
    registrationsByDate,
    maxStalls,
    onApprove,
    onReject,
    onDelete,
    onViewImage,
    canReview,
    canDelete
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {allStallDates.map(date => {
                const regsForDate = registrationsByDate.get(date) || [];
                const totalBooked = regsForDate.length;
                
                return (
                    <div key={date} className="bg-slate-50 rounded-lg border border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-200">
                            <h4 className="font-bold text-slate-800">
                                {formatUTCDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h4>
                            <p className="text-sm text-slate-500 font-semibold">
                                {totalBooked} {maxStalls ? `/ ${maxStalls}` : ''} Stalls Booked
                            </p>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {regsForDate.length > 0 ? (
                                regsForDate.map(reg => (
                                    <div key={reg.id} className="bg-white p-3 rounded-md shadow-sm border border-slate-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-slate-800">{reg.registrantName}</p>
                                                <p className="text-xs text-slate-500">{reg.contactNumber}</p>
                                            </div>
                                            <StatusBadge status={reg.status} />
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                                            <p className="text-xs text-slate-600"><strong>Products:</strong> {reg.products.map(p => p.productName).join(', ')}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-600"><strong>Tables:</strong> {reg.numberOfTables}</span>
                                                <span className="text-slate-600"><strong>Electricity:</strong> {reg.needsElectricity ? 'Yes' : 'No'}</span>
                                            </div>
                                        </div>
                                         {(canReview || canDelete) && (
                                            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
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
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-sm text-slate-500 py-8">No stalls booked for this day.</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StallRegistrationsByDateView;