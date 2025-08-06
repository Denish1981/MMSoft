
import React, { useMemo } from 'react';
import type { Budget, Expense } from '../../types';
import ReportContainer from './ReportContainer';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency } from '../../utils/formatting';

interface BudgetReportProps {
    budgets: Budget[];
    expenses: Expense[];
}

const BudgetReport: React.FC<BudgetReportProps> = ({ budgets, expenses }) => {

    const reportData = useMemo(() => {
        const dataMap = new Map<string, { budgeted: number; actual: number }>();

        // Aggregate budgeted amounts by expense head
        budgets.forEach(budget => {
            const head = budget.expenseHead;
            const current = dataMap.get(head) || { budgeted: 0, actual: 0 };
            current.budgeted += Number(budget.budgetedAmount) || 0;
            dataMap.set(head, current);
        });

        // Aggregate actual expenses by expense head
        expenses.forEach(expense => {
            const head = expense.expenseHead;
            const current = dataMap.get(head) || { budgeted: 0, actual: 0 };
            current.actual += Number(expense.cost) || 0;
            dataMap.set(head, current);
        });

        // Convert map to array and calculate variance
        return Array.from(dataMap.entries()).map(([expenseHead, data]) => {
            const variance = data.budgeted - data.actual;
            const variancePercentage = data.budgeted > 0 ? (variance / data.budgeted) * 100 : (data.actual > 0 ? -Infinity : 0);
            return {
                expenseHead,
                budgeted: data.budgeted,
                actual: data.actual,
                variance,
                variancePercentage,
            };
        }).sort((a, b) => a.expenseHead.localeCompare(b.expenseHead)); // Sort alphabetically

    }, [budgets, expenses]);

    const handleExport = () => {
        const dataToExport = reportData.map(item => ({
            'Expense Head': item.expenseHead,
            'Budgeted Amount': item.budgeted,
            'Actual Expense': item.actual,
            'Variance': item.variance,
            'Variance %': isFinite(item.variancePercentage) ? item.variancePercentage.toFixed(2) : 'N/A',
        }));
        exportToCsv(dataToExport, 'budget_vs_actuals_report');
    };

    const totals = useMemo(() => {
        return reportData.reduce((acc, item) => {
            acc.budgeted += item.budgeted;
            acc.actual += item.actual;
            return acc;
        }, { budgeted: 0, actual: 0 });
    }, [reportData]);
    
    const totalVariance = totals.budgeted - totals.actual;
    const totalVariancePercentage = totals.budgeted > 0 ? (totalVariance / totals.budgeted) * 100 : (totals.actual > 0 ? -Infinity : 0);


    return (
        <ReportContainer title="Budget vs. Actuals Report" onExport={handleExport}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense Head</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Budgeted Amount</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actual Expense</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Variance</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Variance %</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {reportData.map(item => {
                            const isOverBudget = item.variance < 0;
                            const varianceColor = item.variance === 0 ? 'text-slate-500' : isOverBudget ? 'text-red-600' : 'text-green-600';

                            return (
                                <tr key={item.expenseHead} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.expenseHead}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{formatCurrency(item.budgeted)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{formatCurrency(item.actual)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${varianceColor}`}>
                                        {formatCurrency(item.variance)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${varianceColor}`}>
                                        {isFinite(item.variancePercentage) ? `${item.variancePercentage.toFixed(2)}%` : 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">Total</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">{formatCurrency(totals.budgeted)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">{formatCurrency(totals.actual)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(totalVariance)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {isFinite(totalVariancePercentage) ? `${totalVariancePercentage.toFixed(2)}%` : 'N/A'}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                 {reportData.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <p className="text-lg">No budget or expense data to compare.</p>
                        <p className="text-sm">Try adding some items under the 'Budget' and 'Expenses' pages.</p>
                    </div>
                )}
            </div>
        </ReportContainer>
    );
};

export default BudgetReport;
