
import React, { useState, useMemo } from 'react';
import type { Quotation, Vendor, Festival } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, DateInput, SelectInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';

interface QuotationReportProps {
    quotations: Quotation[];
    vendors: Vendor[];
    festivals: Festival[];
}

interface QuotationFilters {
    quotationFor: string;
    vendorId: string;
    costComparator: string;
    costValue: string;
    quotationDate: string;
    festivalId: string;
}

const QuotationReport: React.FC<QuotationReportProps> = ({ quotations, vendors, festivals }) => {
    const [filters, setFilters] = useState<QuotationFilters>({
        quotationFor: '',
        vendorId: '',
        costComparator: '>=',
        costValue: '',
        quotationDate: '',
        festivalId: '',
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
            quotationFor: '',
            vendorId: '',
            costComparator: '>=',
            costValue: '',
            quotationDate: '',
            festivalId: '',
        });
    };

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q => {
            if (filters.quotationFor && !q.quotationFor.toLowerCase().includes(filters.quotationFor.toLowerCase())) return false;
            if (filters.vendorId && q.vendorId !== Number(filters.vendorId)) return false;
            if (filters.festivalId && q.festivalId !== Number(filters.festivalId)) return false;
            
            if (filters.costValue) {
                const costFilterValue = parseFloat(filters.costValue);
                const quotationCost = parseFloat(String(q.cost));
                if (!isNaN(costFilterValue)) {
                    if (filters.costComparator === '>=' && quotationCost < costFilterValue) return false;
                    if (filters.costComparator === '<=' && quotationCost > costFilterValue) return false;
                    if (filters.costComparator === '==' && quotationCost !== costFilterValue) return false;
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
            'Associated Festival': (q.festivalId && festivalMap.get(q.festivalId)) || 'N/A',
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
                <SelectInput label="Festival" value={filters.festivalId} onChange={val => handleFilterChange('festivalId', val)} options={festivalOptions} placeholder="All Festivals" />
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Associated Festival</th>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{(q.festivalId && festivalMap.get(q.festivalId)) || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{formatCurrency(q.cost)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(q.date)}</td>
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
