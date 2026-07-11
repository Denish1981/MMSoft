import React, { useState, useMemo } from 'react';
import type { StallRegistration } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, SelectInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';

interface StallReportProps {
    stallRegistrations: StallRegistration[];
}

interface StallFilters {
    registrantName: string;
    contactNumber: string;
    needsElectricity: string;
    status: string;
    amountComparator: string;
    amountValue: string;
}

const StallReport: React.FC<StallReportProps> = ({ stallRegistrations }) => {
    const [filters, setFilters] = useState<StallFilters>({
        registrantName: '',
        contactNumber: '',
        needsElectricity: '',
        status: '',
        amountComparator: '>=',
        amountValue: '',
    });

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            registrantName: '',
            contactNumber: '',
            needsElectricity: '',
            status: '',
            amountComparator: '>=',
            amountValue: '',
        });
    };

    const filteredRegistrations = useMemo(() => {
        return stallRegistrations.filter(r => {
            if (filters.registrantName && !r.registrantName.toLowerCase().includes(filters.registrantName.toLowerCase())) return false;
            if (filters.contactNumber && !r.contactNumber.includes(filters.contactNumber)) return false;
            
            if (filters.needsElectricity) {
                const needsElecBool = filters.needsElectricity === 'true';
                if (r.needsElectricity !== needsElecBool) return false;
            }

            if (filters.status && r.status !== filters.status) return false;

            if (filters.amountValue) {
                const amountFilterValue = parseFloat(filters.amountValue);
                const totalPaymentValue = parseFloat(String(r.totalPayment));
                if (!isNaN(amountFilterValue)) {
                    if (filters.amountComparator === '>=' && totalPaymentValue < amountFilterValue) return false;
                    if (filters.amountComparator === '<=' && totalPaymentValue > amountFilterValue) return false;
                    if (filters.amountComparator === '==' && totalPaymentValue !== amountFilterValue) return false;
                }
            }

            return true;
        });
    }, [stallRegistrations, filters]);

    const handleExport = () => {
        const dataToExport = filteredRegistrations.map(r => ({
            'Registration ID': r.id,
            'Registrant Name': r.registrantName,
            'Contact Number': r.contactNumber,
            'Needs Electricity': r.needsElectricity ? 'Yes' : 'No',
            'Number of Tables': r.numberOfTables,
            'Stall Dates': r.stallDates.map(d => formatUTCDate(d)).join(', '),
            'Products': r.products.map(p => `${p.productName} (${formatCurrency(p.price)})`).join(', '),
            'Total Payment': r.totalPayment,
            'Status': r.status,
            'Rejection Reason': r.rejectionReason || 'N/A',
            'Reviewed By': r.reviewedBy || 'N/A',
            'Reviewed At': r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : 'N/A',
            'Registered On': new Date(r.submittedAt).toLocaleDateString(),
        }));
        exportToCsv(dataToExport, 'stall_report');
    };

    return (
        <ReportContainer title="Stall Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Registrant Name" value={filters.registrantName} onChange={val => handleFilterChange('registrantName', val)} />
                <TextInput label="Contact Number" value={filters.contactNumber} onChange={val => handleFilterChange('contactNumber', val)} />
                <SelectInput 
                    label="Needs Electricity" 
                    value={filters.needsElectricity} 
                    onChange={val => handleFilterChange('needsElectricity', val)}
                    placeholder="All"
                    options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' }
                    ]}
                />
                <SelectInput 
                    label="Status" 
                    value={filters.status} 
                    onChange={val => handleFilterChange('status', val)}
                    placeholder="All"
                    options={[
                        { value: 'Pending', label: 'Pending' },
                        { value: 'Approved', label: 'Approved' },
                        { value: 'Rejected', label: 'Rejected' }
                    ]}
                />
                <AmountInput
                    label="Total Payment"
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registrant Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Electricity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tables</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Payment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stall Dates</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredRegistrations.length > 0 ? filteredRegistrations.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{r.registrantName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.contactNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.needsElectricity ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {r.needsElectricity ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.numberOfTables}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{formatCurrency(r.totalPayment)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        r.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                        r.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={r.stallDates.map(d => formatUTCDate(d)).join(', ')}>
                                    {r.stallDates.map(d => formatUTCDate(d)).join(', ')}
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={7} className="text-center py-10 text-slate-500">
                                    {stallRegistrations.length === 0 ? "No stall registrations have been added yet." : "No stall registrations match your current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default StallReport;
