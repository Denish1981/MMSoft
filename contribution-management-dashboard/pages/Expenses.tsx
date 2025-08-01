
import React, { useMemo, useState } from 'react';
import type { Expense, Vendor } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { formatCurrency } from '../utils/formatting';

interface ExpensesProps {
    expenses: Expense[];
    vendors: Vendor[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, vendors, onEdit, onDelete }) => {
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
    const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);

    return (
        <>
            {viewingReceipt && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100]" 
                    onClick={() => setViewingReceipt(null)}
                >
                    <div className="p-4 bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <img src={viewingReceipt} alt="Full size receipt" className="max-w-full max-h-[85vh] object-contain" />
                    </div>
                </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">All Expenses</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Head</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Done By</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {expenses.map(expense => (
                                <tr key={expense.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{expense.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendorMap.get(expense.vendorId) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{formatCurrency(expense.cost)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(expense.billDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{expense.expenseHead}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{expense.expenseBy}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {expense.billReceipt ? (
                                            <img 
                                                src={expense.billReceipt} 
                                                alt="Receipt thumbnail" 
                                                className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform mx-auto"
                                                onClick={() => setViewingReceipt(expense.billReceipt!)}
                                            />
                                        ) : (
                                            <span className="text-slate-400 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => onEdit(expense)} className="text-slate-600 hover:text-slate-900" title="Edit Expense">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDelete(expense.id)} className="text-red-600 hover:text-red-900" title="Delete Expense">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default Expenses;
