

import React, { useState, useMemo } from 'react';
import type { Sponsor } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, DateInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';

interface SponsorReportProps {
    sponsors: Sponsor[];
}

interface SponsorFilters {
    sponsorName: string;
    businessCategory: string;
    sponsorshipType: string;
    amountComparator: string;
    amountValue: string;
    datePaid: string;
}

const SponsorReport: React.FC<SponsorReportProps> = ({ sponsors }) => {
    const [filters, setFilters] = useState<SponsorFilters>({
        sponsorName: '',
        businessCategory: '',
        sponsorshipType: '',
        amountComparator: '>=',
        amountValue: '',
        datePaid: '',
    });

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            sponsorName: '',
            businessCategory: '',
            sponsorshipType: '',
            amountComparator: '>=',
            amountValue: '',
            datePaid: '',
        });
    };

    const filteredSponsors = useMemo(() => {
        return sponsors.filter(s => {
            if (filters.sponsorName && !s.name.toLowerCase().includes(filters.sponsorName.toLowerCase())) return false;
            if (filters.businessCategory && !s.businessCategory.toLowerCase().includes(filters.businessCategory.toLowerCase())) return false;
            if (filters.sponsorshipType && !s.sponsorshipType.toLowerCase().includes(filters.sponsorshipType.toLowerCase())) return false;

            if (filters.amountValue) {
                const amountFilterValue = parseFloat(filters.amountValue);
                const sponsorAmount = parseFloat(String(s.sponsorshipAmount));
                if (!isNaN(amountFilterValue)) {
                    if (filters.amountComparator === '>=' && sponsorAmount < amountFilterValue) return false;
                    if (filters.amountComparator === '<=' && sponsorAmount > amountFilterValue) return false;
                    if (filters.amountComparator === '==' && sponsorAmount !== amountFilterValue) return false;
                }
            }

            if (filters.datePaid) {
                const sponsorDate = new Date(s.datePaid).setHours(0,0,0,0);
                const filterDate = new Date(filters.datePaid).setHours(0,0,0,0);
                if (sponsorDate !== filterDate) return false;
            }

            return true;
        });
    }, [sponsors, filters]);

    const handleExport = () => {
        const dataToExport = filteredSponsors.map(s => ({
            'Sponsor ID': s.id,
            'Sponsor Name': s.name,
            'Contact Number': s.contactNumber,
            'Email': s.email,
            'Address': s.address,
            'Business Category': s.businessCategory,
            'Business Info': s.businessInfo,
            'Sponsorship Amount': s.sponsorshipAmount,
            'Sponsorship Type': s.sponsorshipType,
            'Date Paid': new Date(s.datePaid).toLocaleDateString(),
            'Payment Received By': s.paymentReceivedBy,
        }));
        exportToCsv(dataToExport, 'sponsor_report');
    };

    return (
        <ReportContainer title="Sponsor Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Sponsor Name" value={filters.sponsorName} onChange={val => handleFilterChange('sponsorName', val)} />
                <TextInput label="Business Category" value={filters.businessCategory} onChange={val => handleFilterChange('businessCategory', val)} />
                <TextInput label="Sponsorship Type" value={filters.sponsorshipType} onChange={val => handleFilterChange('sponsorshipType', val)} />
                <AmountInput
                    label="Amount"
                    comparator={filters.amountComparator}
                    onComparatorChange={val => handleFilterChange('amountComparator', val)}
                    value={filters.amountValue}
                    onValueChange={val => handleFilterChange('amountValue', val)}
                />
                <DateInput label="Date Paid" value={filters.datePaid} onChange={val => handleFilterChange('datePaid', val)} />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sponsor Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Paid</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Received By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredSponsors.length > 0 ? filteredSponsors.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{s.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.businessCategory}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{formatCurrency(s.sponsorshipAmount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.sponsorshipType}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(s.datePaid)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.paymentReceivedBy}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.contactNumber}</td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={7} className="text-center py-10 text-slate-500">
                                    {sponsors.length === 0 ? "No sponsors have been added yet." : "No sponsors match your current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default SponsorReport;