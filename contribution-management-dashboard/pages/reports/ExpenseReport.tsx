import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Expense, Vendor, Festival } from '../../types';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, DateInput, SelectInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';

interface ExpenseReportProps {
    expenses: Expense[];
    vendors: Vendor[];
    festivals: Festival[];
}

interface ExpenseFilters {
    expenseName: string;
    vendorId: string;
    costComparator: string;
    costValue: string;
    doneBy: string;
    expenseHead: string;
    expenseDate: string;
    festivalId: string;
}

const ExpenseReport: React.FC<ExpenseReportProps> = ({ expenses, vendors, festivals }) => {
    const [searchParams] = useSearchParams();
    
    const [filters, setFilters] = useState<ExpenseFilters>({
        expenseName: searchParams.get('expenseName') || '',
        vendorId: searchParams.get('vendorId') || '',
        costComparator: searchParams.get('costComparator') || '>=',
        costValue: searchParams.get('costValue') || '',
        doneBy: searchParams.get('doneBy') || '',
        expenseHead: searchParams.get('expenseHead') || '',
        expenseDate: searchParams.get('expenseDate') || '',
        festivalId: searchParams.get('festivalId') || '',
    });

    const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);
    const vendorOptions = useMemo(() => vendors.map(v => ({ value: String(v.id), label: v.name })), [vendors]);
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);
    const festivalOptions = useMemo(() => festivals.map(f => ({ value: String(f.id), label: f.name })), [festivals]);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            expenseName: '',
            vendorId: '',
            costComparator: '>=',
            costValue: '',
            doneBy: '',
            expenseHead: '',
            expenseDate: '',
            festivalId: '',
        });
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            if (filters.expenseName && !e.name.toLowerCase().includes(filters.expenseName.toLowerCase())) return false;
            if (filters.vendorId && e.vendorId !== Number(filters.vendorId)) return false;
            if (filters.doneBy && !e.expenseBy.toLowerCase().includes(filters.doneBy.toLowerCase())) return false;
            if (filters.expenseHead && !e.expenseHead.toLowerCase().includes(filters.expenseHead.toLowerCase())) return false;
            if (filters.festivalId && e.festivalId !== Number(filters.festivalId)) return false;
            
            if (filters.costValue) {
                const cost = parseFloat(filters.costValue);
                if (!isNaN(cost)) {
                    if (filters.costComparator === '>=' && e.totalCost < cost) return false;
                    if (filters.costComparator === '<=' && e.totalCost > cost) return false;
                    if (filters.costComparator === '==' && e.totalCost !== cost) return false;
                }
            }

            if (filters.expenseDate) {
                const expenseDate = new Date(e.billDate).setHours(0,0,0,0);
                const filterDate = new Date(filters.expenseDate).setHours(0,0,0,0);
                if (expenseDate !== filterDate) return false;
            }

            return true;
        });
    }, [expenses, filters]);

    const handleExport = () => {
        const dataToExport = filteredExpenses.map(e => ({
            'Expense ID': e.id,
            'Expense Name': e.name,
            'Vendor': vendorMap.get(e.vendorId) || 'N/A',
            'Associated Festival': (e.festivalId && festivalMap.get(e.festivalId)) || 'N/A',
            'Total Cost': e.totalCost,
            'Amount Paid': e.amountPaid || 0,
            'Outstanding Amount': e.outstandingAmount || 0,
            'Bill Date': new Date(e.billDate).toLocaleDateString(),
            'Expense Head': e.expenseHead,
            'Done By': e.expenseBy,
        }));
        exportToCsv(dataToExport, 'expense_report');
    };
    
    return (
        <ReportContainer title="Expense Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Expense Name" value={filters.expenseName} onChange={val => handleFilterChange('expenseName', val)} />
                <SelectInput label="Vendor" value={filters.vendorId} onChange={val => handleFilterChange('vendorId', val)} options={vendorOptions} placeholder="All Vendors" />
                <SelectInput label="Festival" value={filters.festivalId} onChange={val => handleFilterChange('festivalId', val)} options={festivalOptions} placeholder="All Festivals" />
                <AmountInput
                    label="Total Cost"
                    comparator={filters.costComparator}
                    onComparatorChange={val => handleFilterChange('costComparator', val)}
                    value={filters.costValue}
                    onValueChange={val => handleFilterChange('costValue', val)}
                />
                <TextInput label="Done By" value={filters.doneBy} onChange={val => handleFilterChange('doneBy', val)} />
                <TextInput label="Expense Head" value={filters.expenseHead} onChange={val => handleFilterChange('expenseHead', val)} />
                <DateInput label="Expense Date" value={filters.expenseDate} onChange={val => handleFilterChange('expenseDate', val)} />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount Paid</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredExpenses.map(e => (
                            <tr key={e.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{e.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendorMap.get(e.vendorId) || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 text-right">{formatCurrency(e.totalCost)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(e.amountPaid || 0)}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${(e.outstandingAmount || 0) > 0 ? 'text-red-600' : 'text-slate-500'}`}>{formatCurrency(e.outstandingAmount || 0)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(e.billDate)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default ExpenseReport;
