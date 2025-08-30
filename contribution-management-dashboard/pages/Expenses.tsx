
import React, { useMemo, useState, useEffect } from 'react';
import type { Expense, Vendor, Festival } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { formatCurrency } from '../utils/formatting';
import { CloseIcon } from '../components/icons/CloseIcon';
import FinanceNavigation from '../components/FinanceNavigation';
import { FilterContainer, TextInput, SelectInput, AmountInput, DateInput } from './reports/FilterControls';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';

interface ExpensesProps {
    expenses: Expense[];
    vendors: Vendor[];
    festivals: Festival[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: number) => void;
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

interface ExpenseFilters {
    name: string;
    vendorId: string;
    costComparator: string;
    costValue: string;
    billDate: string;
    expenseHead: string;
}

const ImageViewerModal: React.FC<{ images: string[], onClose: () => void }> = ({ images, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstImage = currentIndex === 0;
        const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastImage = currentIndex === images.length - 1;
        const newIndex = isLastImage ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100]" 
            onClick={onClose}
        >
             <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-slate-300 z-20">
                <CloseIcon className="w-8 h-8" />
            </button>
            {images.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 z-20"
                    >
                        &lt;
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 z-20"
                    >
                        &gt;
                    </button>
                </>
            )}
            <div className="relative p-4" onClick={e => e.stopPropagation()}>
                <img src={images[currentIndex]} alt={`Receipt image ${currentIndex + 1}`} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
                 {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
};

const Expenses: React.FC<ExpensesProps> = ({ expenses, vendors, festivals, onEdit, onDelete, onViewHistory }) => {
    const [viewingImages, setViewingImages] = useState<string[] | null>(null);
    const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);
    
    const [filters, setFilters] = useState<ExpenseFilters>({
        name: '',
        vendorId: '',
        costComparator: '>=',
        costValue: '',
        billDate: '',
        expenseHead: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const vendorOptions = useMemo(() => vendors.map(v => ({ value: String(v.id), label: v.name })), [vendors]);
    const expenseHeadOptions = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseHead))).sort().map(head => ({ value: head, label: head })), [expenses]);

    const handleFilterChange = (field: keyof ExpenseFilters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({ name: '', vendorId: '', costComparator: '>=', costValue: '', billDate: '', expenseHead: '' });
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            if (filters.name && !e.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.vendorId && e.vendorId !== Number(filters.vendorId)) return false;
            if (filters.expenseHead && e.expenseHead !== filters.expenseHead) return false;
            if (filters.billDate && !e.billDate.startsWith(filters.billDate)) return false;
            
            if (filters.costValue) {
                const cost = parseFloat(filters.costValue);
                if (!isNaN(cost)) {
                    if (filters.costComparator === '>=' && e.cost < cost) return false;
                    if (filters.costComparator === '<=' && e.cost > cost) return false;
                    if (filters.costComparator === '==' && e.cost !== cost) return false;
                }
            }
            return true;
        });
    }, [expenses, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, rowsPerPage]);

    const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);
    const paginatedExpenses = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredExpenses.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredExpenses, currentPage, rowsPerPage]);

    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));


    return (
        <div className="space-y-6">
            <FinanceNavigation />
            {viewingImages && <ImageViewerModal images={viewingImages} onClose={() => setViewingImages(null)} />}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <FilterContainer onReset={resetFilters}>
                    <TextInput label="Expense Name" value={filters.name} onChange={val => handleFilterChange('name', val)} />
                    <SelectInput label="Vendor" value={filters.vendorId} onChange={val => handleFilterChange('vendorId', val)} options={vendorOptions} placeholder="All Vendors" />
                    <AmountInput label="Cost" comparator={filters.costComparator} onComparatorChange={val => handleFilterChange('costComparator', val)} value={filters.costValue} onValueChange={val => handleFilterChange('costValue', val)} />
                    <DateInput label="Bill Date" value={filters.billDate} onChange={val => handleFilterChange('billDate', val)} />
                    <SelectInput label="Expense Head" value={filters.expenseHead} onChange={val => handleFilterChange('expenseHead', val)} options={expenseHeadOptions} placeholder="All Heads" />
                </FilterContainer>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Head</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Receipts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedExpenses.map(expense => (
                                <tr key={expense.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{expense.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendorMap.get(expense.vendorId) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{formatCurrency(expense.cost)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(expense.billDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{expense.expenseHead}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {expense.billReceipts && expense.billReceipts.length > 0 ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                {expense.billReceipts.slice(0, 3).map((image, index) => (
                                                    <img 
                                                        key={index}
                                                        src={image} 
                                                        alt={`Thumbnail ${index + 1}`}
                                                        className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform"
                                                        onClick={() => setViewingImages(expense.billReceipts!)}
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
                                            <button onClick={() => onViewHistory('expenses', expense.id, `History for ${expense.name}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
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
                              {paginatedExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-slate-500">
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
                            onChange={e => setRowsPerPage(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            aria-label="Rows per page"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                    <div className="text-sm text-slate-600" aria-live="polite">
                        Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({filteredExpenses.length} items)
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Expenses;
