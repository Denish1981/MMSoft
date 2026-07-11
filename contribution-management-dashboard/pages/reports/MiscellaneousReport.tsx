import React, { useState, useMemo, useEffect } from 'react';
import type { Contribution } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';
import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';

interface MiscellaneousReportProps {
    contributions: Contribution[];
}

interface MiscellaneousFilters {
    sourceName: string;
    amountComparator: string;
    amountValue: string;
}

const MiscellaneousReport: React.FC<MiscellaneousReportProps> = ({ contributions }) => {
    const [filters, setFilters] = useState<MiscellaneousFilters>({
        sourceName: '',
        amountComparator: '>=',
        amountValue: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            sourceName: '',
            amountComparator: '>=',
            amountValue: '',
        });
    };

    // Filter contributions that are specifically Miscellaneous
    const miscContributions = useMemo(() => {
        return contributions.filter(c => c.type === 'Miscellaneous' || c.type?.startsWith('Miscellaneous:'));
    }, [contributions]);

    const filteredContributions = useMemo(() => {
        return miscContributions.filter(c => {
            if (filters.sourceName && !c.donorName.toLowerCase().includes(filters.sourceName.toLowerCase())) return false;
            
            if (filters.amountValue) {
                const amountFilterValue = parseFloat(filters.amountValue);
                const contributionAmount = parseFloat(String(c.amount));
                if (!isNaN(amountFilterValue)) {
                    if (filters.amountComparator === '>=' && contributionAmount < amountFilterValue) return false;
                    if (filters.amountComparator === '<=' && contributionAmount > amountFilterValue) return false;
                    if (filters.amountComparator === '==' && contributionAmount !== amountFilterValue) return false;
                }
            }
            return true;
        });
    }, [miscContributions, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, rowsPerPage]);

    const totalPages = Math.ceil(filteredContributions.length / rowsPerPage);
    const paginatedContributions = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredContributions.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredContributions, currentPage, rowsPerPage]);

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleExport = () => {
        const dataToExport = filteredContributions.map(c => ({
            ID: c.id,
            'Name / Source': c.donorName,
            'Income Type': c.type?.startsWith('Miscellaneous:') ? c.type.substring('Miscellaneous:'.length).trim() : 'Miscellaneous',
            'Amount': c.amount,
            'Date': new Date(c.date).toLocaleString(),
            'Status': c.status,
            'Campaign ID': c.campaignId,
        }));
        exportToCsv(dataToExport, 'miscellaneous_contribution_report');
    };

    return (
        <ReportContainer title="Miscellaneous Contribution Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Name / Source" value={filters.sourceName} onChange={val => handleFilterChange('sourceName', val)} />
                <AmountInput
                    label="Amount"
                    comparator={filters.amountComparator}
                    onComparatorChange={val => handleFilterChange('amountComparator', val)}
                    value={filters.amountValue}
                    onValueChange={val => handleFilterChange('amountValue', val)}
                />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name / Source</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Income Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedContributions.length > 0 ? paginatedContributions.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.donorName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {c.type?.startsWith('Miscellaneous:') 
                                        ? c.type.substring('Miscellaneous:'.length).trim() 
                                        : 'Miscellaneous'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{formatCurrency(c.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(c.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.status}</td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={5} className="text-center py-10 text-slate-500">
                                    {miscContributions.length === 0 ? "No miscellaneous contributions match the campaign." : "No miscellaneous contributions match your filters."}
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
                    Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({filteredContributions.length} items)
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
        </ReportContainer>
    );
};

export default MiscellaneousReport;
