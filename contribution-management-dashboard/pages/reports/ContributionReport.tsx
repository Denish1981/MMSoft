

import React, { useState, useMemo } from 'react';
import type { Contribution, ContributionType } from '../../types';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, FilterContainer, SelectInput } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency } from '../../utils/formatting';

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
                const amount = parseFloat(filters.amountValue);
                if (!isNaN(amount)) {
                    if (filters.amountComparator === '>=' && c.amount < amount) return false;
                    if (filters.amountComparator === '<=' && c.amount > amount) return false;
                    if (filters.amountComparator === '==' && c.amount !== amount) return false;
                }
            }
            return true;
        });
    }, [contributions, filters]);

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
                        {filteredContributions.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.donorName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.mobileNumber || c.donorEmail || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{`T-${c.towerNumber}, F-${c.flatNumber}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{formatCurrency(c.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(c.date).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default ContributionReport;
