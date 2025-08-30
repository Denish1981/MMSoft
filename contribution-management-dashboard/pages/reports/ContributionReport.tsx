
import React, { useState, useMemo, useEffect } from 'react';
import type { Contribution, ContributionType } from '../../types';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, FilterContainer, SelectInput } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';
import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';

interface ContributionReportProps {
    contributions: Contribution[];
}

interface ContributionFilters {
    towerNumber: string;
    flatNumber: string;
    donorName: string;
    mobileNumber: string;
    amountComparator: string;
    amountValue: string;
    type: string;
}

const ContributionReport: React.FC<ContributionReportProps> = ({ contributions }) => {
    const [filters, setFilters] = useState<ContributionFilters>({
        towerNumber: '',
        flatNumber: '',
        donorName: '',
        mobileNumber: '',
        amountComparator: '>=',
        amountValue: '',
        type: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            towerNumber: '',
            flatNumber: '',
            donorName: '',
            mobileNumber: '',
            amountComparator: '>=',
            amountValue: '',
            type: '',
        });
    };

    const filteredContributions = useMemo(() => {
        return contributions.filter(c => {
            if (filters.towerNumber && !c.towerNumber.toLowerCase().includes(filters.towerNumber.toLowerCase())) return false;
            if (filters.flatNumber && !c.flatNumber.toLowerCase().includes(filters.flatNumber.toLowerCase())) return false;
            if (filters.donorName && !c.donorName.toLowerCase().includes(filters.donorName.toLowerCase())) return false;
            if (filters.mobileNumber && c.mobileNumber && !c.mobileNumber.includes(filters.mobileNumber)) return false;
            if (filters.type && c.type !== filters.type) return false;
            
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
    }, [contributions, filters]);

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
            'Donor Name': c.donorName,
            'Donor Email': c.donorEmail,
            'Mobile Number': c.mobileNumber,
            'Tower Number': c.towerNumber,
            'Flat Number': c.flatNumber,
            'Amount': c.amount,
            'Type': c.type,
            'Number of Coupons': c.numberOfCoupons,
            'Campaign ID': c.campaignId,
            'Date': new Date(c.date).toLocaleString(),
            'Status': c.status,
            'Has Image': c.image ? 'Yes' : 'No'
        }));
        exportToCsv(dataToExport, 'contribution_report');
    };
    
    return (
        <ReportContainer title="Contribution Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Tower Number" value={filters.towerNumber} onChange={val => handleFilterChange('towerNumber', val)} />
                <TextInput label="Flat Number" value={filters.flatNumber} onChange={val => handleFilterChange('flatNumber', val)} />
                <TextInput label="Donor Name" value={filters.donorName} onChange={val => handleFilterChange('donorName', val)} />
                <TextInput label="Mobile Number" value={filters.mobileNumber} onChange={val => handleFilterChange('mobileNumber', val)} />
                <AmountInput
                    label="Amount"
                    comparator={filters.amountComparator}
                    onComparatorChange={val => handleFilterChange('amountComparator', val)}
                    value={filters.amountValue}
                    onValueChange={val => handleFilterChange('amountValue', val)}
                />
                <SelectInput 
                    label="Type"
                    value={filters.type}
                    onChange={val => handleFilterChange('type', val)}
                    options={[{ value: 'Online', label: 'Online' }, { value: 'Cash', label: 'Cash' }]}
                    placeholder="All Types"
                />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Donor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Residence</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedContributions.length > 0 ? paginatedContributions.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.donorName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.mobileNumber || c.donorEmail || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{`T-${c.towerNumber}, F-${c.flatNumber}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{formatCurrency(c.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(c.date)}</td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-500">
                                    {contributions.length === 0 ? "No contributions have been added yet." : "No contributions match your current filters."}
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

export default ContributionReport;
