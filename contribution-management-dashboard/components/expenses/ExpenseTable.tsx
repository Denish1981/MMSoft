import React from 'react';
import type { Expense } from '../../types/index';
import { EditIcon } from '../icons/EditIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { HistoryIcon } from '../icons/HistoryIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';

interface ExpenseTableProps {
    expenses: Expense[];
    paginatedExpenses: Expense[];
    vendorMap: Map<number, string>;
    onViewReceipts: (images: string[]) => void;
    onOpenHistory: (id: number, title: string) => void;
    onEditExpense: (expense: Expense) => void;
    onDeleteExpense: (id: number) => void;
    currentPage: number;
    totalPages: number;
    rowsPerPage: number;
    onRowsPerPageChange: (rows: number) => void;
    onNextPage: () => void;
    onPreviousPage: () => void;
    totalFilteredCount: number;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
    expenses,
    paginatedExpenses,
    vendorMap,
    onViewReceipts,
    onOpenHistory,
    onEditExpense,
    onDeleteExpense,
    currentPage,
    totalPages,
    rowsPerPage,
    onRowsPerPageChange,
    onNextPage,
    onPreviousPage,
    totalFilteredCount,
}) => {
    return (
        <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill Date</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Receipts</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedExpenses.map(expense => (
                            <tr key={expense.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{expense.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendorMap.get(expense.vendorId) || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold text-right">{formatCurrency(expense.totalCost)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(expense.amountPaid || 0)}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${(expense.outstandingAmount || 0) > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                    {formatCurrency(expense.outstandingAmount || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(expense.billDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {expense.billReceipts && expense.billReceipts.length > 0 ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            {expense.billReceipts.slice(0, 3).map((image, index) => (
                                                <img 
                                                    key={index}
                                                    src={image} 
                                                    alt={`Thumbnail ${index + 1}`}
                                                    className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform"
                                                    onClick={() => onViewReceipts(expense.billReceipts!)}
                                                />
                                            ))}
                                            {expense.billReceipts.length > 3 && (
                                                <div className="flex items-center justify-center h-10 w-16 bg-slate-200 text-slate-600 font-bold text-sm rounded-md">
                                                    +{expense.billReceipts.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs">N/A</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => onOpenHistory(expense.id, `History for ${expense.name}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                            <HistoryIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onEditExpense(expense)} className="text-slate-600 hover:text-slate-900" title="Edit Expense">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDeleteExpense(expense.id)} className="text-red-600 hover:text-red-900" title="Delete Expense">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedExpenses.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-slate-500">
                                    {expenses.length === 0 ? "No expenses have been added yet." : "No expenses match your current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-4 border-t border-slate-200 gap-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <span>Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={e => onRowsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        aria-label="Rows per page"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div className="text-sm text-slate-600" aria-live="polite">
                    Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({totalFilteredCount} items)
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onPreviousPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous page"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onNextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next page"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
};
