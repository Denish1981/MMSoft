import React, { useMemo, useState, useEffect } from 'react';
import type { Expense } from '../types/index';
import FinanceNavigation from '../components/FinanceNavigation';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';
import { ReceiptsGalleryModal } from '../components/expenses/ReceiptsGalleryModal';
import { ExpenseFilterSection, type ExpenseFilterState } from '../components/expenses/ExpenseFilterSection';
import { ExpenseTable } from '../components/expenses/ExpenseTable';

const Expenses: React.FC = () => {
    const { expenses, vendors, festivals, selectedCampaignId } = useData();
    const { openExpenseModal, openConfirmationModal, openHistoryModal } = useModal();
    
    const [viewingImages, setViewingImages] = useState<string[] | null>(null);
    const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);
    
    const [filters, setFilters] = useState<ExpenseFilterState>({
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

    const handleFilterChange = (field: keyof ExpenseFilterState, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({ name: '', vendorId: '', costComparator: '>=', costValue: '', billDate: '', expenseHead: '' });
    };

    const filteredExpenses = useMemo(() => {
        let baseExpenses = expenses;

        // Filter by global campaign filter
        if (selectedCampaignId !== 'all') {
            const campId = Number(selectedCampaignId);
            const campaignFestivalIds = festivals.filter(f => f.campaignId === campId).map(f => f.id);
            baseExpenses = baseExpenses.filter(e => e.festivalId && campaignFestivalIds.includes(e.festivalId));
        }

        return baseExpenses.filter(e => {
            if (filters.name && !e.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.vendorId && e.vendorId !== Number(filters.vendorId)) return false;
            if (filters.expenseHead && e.expenseHead !== filters.expenseHead) return false;
            if (filters.billDate && !e.billDate.startsWith(filters.billDate)) return false;
            
            if (filters.costValue) {
                const costFilterValue = parseFloat(filters.costValue);
                const expenseCost = parseFloat(String(e.totalCost));
                if (!isNaN(costFilterValue)) {
                    if (filters.costComparator === '>=' && expenseCost < costFilterValue) return false;
                    if (filters.costComparator === '<=' && expenseCost > costFilterValue) return false;
                    if (filters.costComparator === '==' && expenseCost !== costFilterValue) return false;
                }
            }
            return true;
        });
    }, [expenses, filters, selectedCampaignId, festivals]);

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
            {viewingImages && <ReceiptsGalleryModal images={viewingImages} onClose={() => setViewingImages(null)} />}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <ExpenseFilterSection
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onResetFilters={resetFilters}
                    vendorOptions={vendorOptions}
                    expenseHeadOptions={expenseHeadOptions}
                />

                <ExpenseTable
                    expenses={expenses}
                    paginatedExpenses={paginatedExpenses}
                    vendorMap={vendorMap}
                    onViewReceipts={setViewingImages}
                    onOpenHistory={(id, title) => openHistoryModal('expenses', id, title)}
                    onEditExpense={openExpenseModal}
                    onDeleteExpense={(id) => openConfirmationModal(id, 'expenses')}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={setRowsPerPage}
                    onNextPage={handleNextPage}
                    onPreviousPage={handlePreviousPage}
                    totalFilteredCount={filteredExpenses.length}
                />
            </div>
        </div>
    );
};

export default Expenses;
