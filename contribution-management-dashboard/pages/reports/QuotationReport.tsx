
import React, { useState, useMemo } from 'react';
import type { Quotation, Vendor } from '../../types';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, DateInput, SelectInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency } from '../../utils/formatting';

interface QuotationReportProps {
    quotations: Quotation[];
    vendors: Vendor[];
}

const QuotationReport: React.FC<QuotationReportProps> = ({ quotations, vendors }) => {
    const [filters, setFilters] = useState({
        quotationFor: '',
        vendorId: '',
        costComparator: '>=',
        costValue: '',
        quotationDate: '',
    });

    const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors]);
    const vendorOptions = useMemo(() => vendors.map(v => ({ value: v.id, label: v.name })), [vendors]);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            quotationFor: '',
            vendorId: '',
            costComparator: '>=',
            costValue: '',
            quotationDate: '',
        });
    };

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q => {
            if (filters.quotationFor && !q.quotationFor.toLowerCase().includes(filters.quotationFor.toLowerCase())) return false;
            if (filters.vendorId && q.vendorId !== filters.vendorId) return false;
            
            if (filters.costValue) {
                const cost = parseFloat(filters.costValue);
                if (!isNaN(cost)) {
                    if (filters.costComparator === '>=' && q.cost < cost) return false;
                    if (filters.costComparator === '<=' && q.cost > cost) return false;
                    if (filters.costComparator === '==' && q.cost !== cost) return false;
                }
            }
            
            if (filters.quotationDate) {
                const quoteDate = new Date(q.date).setHours(0,0,0,0);
                const filterDate = new Date(filters.quotationDate).setHours(0,0,0,0);
                if (quoteDate !== filterDate) return false;
            }

            return true;
        });
    }, [quotations, filters]);

    const handleExport = () => {
        const dataToExport = filteredQuotations.map(q => ({
            'Quotation ID': q.id,
            'Quotation For': q.quotationFor,
            'Vendor': vendorMap.get(q.vendorId) || 'N/A',
            'Cost': q.cost,
            'Date': new Date(q.date).toLocaleDateString(),
            'Image Count': q.quotationImages.length,
        }));
        exportToCsv(dataToExport, 'quotation_report');
    };

    return (
        <ReportContainer title="Quotation Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Quotation For" value={filters.quotationFor} onChange={val => handleFilterChange('quotationFor', val)} />
                <SelectInput label="Vendor" value={filters.vendorId} onChange={val => handleFilterChange('vendorId', val)} options={vendorOptions} placeholder="All Vendors" />
                <AmountInput
                    label="Cost"
                    comparator={filters.costComparator}
                    onComparatorChange={val => handleFilterChange('costComparator', val)}
                    value={filters.costValue}
                    onValueChange={val => handleFilterChange('costValue', val)}
                />
                <DateInput label="Quotation Date" value={filters.quotationDate} onChange={val => handleFilterChange('quotationDate', val)} />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Quotation For</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image Count</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredQuotations.map(q => (
                            <tr key={q.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{q.quotationFor}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{vendorMap.get(q.vendorId) || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{formatCurrency(q.cost)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(q.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{q.quotationImages.length}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default QuotationReport;
