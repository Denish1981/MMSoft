import React from 'react';
import { FilterContainer, TextInput, SelectInput, AmountInput, DateInput } from '../../pages/reports/FilterControls';

export interface ExpenseFilterState {
    name: string;
    vendorId: string;
    costComparator: string;
    costValue: string;
    billDate: string;
    expenseHead: string;
}

interface ExpenseFilterSectionProps {
    filters: ExpenseFilterState;
    onFilterChange: (field: keyof ExpenseFilterState, value: string) => void;
    onResetFilters: () => void;
    vendorOptions: { value: string; label: string }[];
    expenseHeadOptions: { value: string; label: string }[];
}

export const ExpenseFilterSection: React.FC<ExpenseFilterSectionProps> = ({
    filters,
    onFilterChange,
    onResetFilters,
    vendorOptions,
    expenseHeadOptions,
}) => {
    return (
        <FilterContainer onReset={onResetFilters}>
            <TextInput label="Expense Name" value={filters.name} onChange={val => onFilterChange('name', val)} />
            <SelectInput label="Vendor" value={filters.vendorId} onChange={val => onFilterChange('vendorId', val)} options={vendorOptions} placeholder="All Vendors" />
            <AmountInput label="Total Cost" comparator={filters.costComparator} onComparatorChange={val => onFilterChange('costComparator', val)} value={filters.costValue} onValueChange={val => onFilterChange('costValue', val)} />
            <DateInput label="Bill Date" value={filters.billDate} onChange={val => onFilterChange('billDate', val)} />
            <SelectInput label="Expense Head" value={filters.expenseHead} onChange={val => onFilterChange('expenseHead', val)} options={expenseHeadOptions} placeholder="All Heads" />
        </FilterContainer>
    );
};
