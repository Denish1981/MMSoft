import React, { useMemo } from 'react';
import type { Budget } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { formatCurrency } from '../utils/formatting';
import ReportContainer from './reports/ReportContainer';
import { exportToCsv } from '../utils/exportUtils';
import FinanceNavigation from '../components/FinanceNavigation';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

const Budget: React.FC = () => {
    const { budgets, festivalMap } = useData();
    const { openBudgetModal, openConfirmationModal, openHistoryModal } = useModal();
    
    const handleExport = () => {
        const dataToExport = budgets.map(budget => ({
            'Budget ID': budget.id,
            'Item Name': budget.itemName,
            'Expense Head': budget.expenseHead,
            'Budgeted Amount': budget.budgetedAmount,
            'Associated Festival': (budget.festivalId && festivalMap.get(budget.festivalId)) || 'N/A',
        }));
        exportToCsv(dataToExport, 'budget_management_report');
    };

    return (
        <div className="space-y-6">
            <FinanceNavigation />
            <ReportContainer title="Budget Items" onExport={handleExport}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Head</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Associated Festival</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Budgeted Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {budgets.map(budget => (
                                <tr key={budget.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{budget.itemName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{budget.expenseHead}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{(budget.festivalId && festivalMap.get(budget.festivalId)) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{formatCurrency(budget.budgetedAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => openHistoryModal('budgets', budget.id, `History for ${budget.itemName}`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openBudgetModal(budget)} className="text-slate-600 hover:text-slate-900" title="Edit Budget">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openConfirmationModal(budget.id, 'budgets')} className="text-red-600 hover:text-red-900" title="Delete Budget">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {budgets.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <p>No budget items found.</p>
                            <p className="text-sm">Click "Add Budget Item" to get started.</p>
                        </div>
                    )}
                </div>
            </ReportContainer>
        </div>
    );
};

export default Budget;
