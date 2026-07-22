import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
import { formatCurrency } from '../../utils/formatting';
import type { Expense } from '../../types/index';

export interface OutstandingPaymentItem extends Expense {
    vendorName: string;
}

interface OutstandingPaymentsWidgetProps {
    outstandingPayments: OutstandingPaymentItem[];
    totalOutstanding: number;
}

export const OutstandingPaymentsWidget: React.FC<OutstandingPaymentsWidgetProps> = ({
    outstandingPayments,
    totalOutstanding,
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full mr-4">
                        <AlertTriangleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">Outstanding Payments</h3>
                        <p className="text-sm text-slate-500">
                            {outstandingPayments.length > 0 ? `${outstandingPayments.length} pending payments` : 'All payments are up to date'}
                        </p>
                    </div>
                </div>
                {outstandingPayments.length > 0 && (
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
                        <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(totalOutstanding)}
                        </p>
                    </div>
                )}
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {outstandingPayments.length > 0 ? (
                    outstandingPayments.map(payment => (
                        <Link to="/expenses" key={payment.id} className="block p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-700">{payment.name}</p>
                                    <p className="text-xs text-slate-500">{payment.vendorName}</p>
                                </div>
                                <p className="font-bold text-red-600">
                                    {formatCurrency(payment.outstandingAmount || 0)}
                                </p>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        <p className="font-semibold">All Clear!</p>
                        <p className="text-sm">No outstanding expense payments found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
