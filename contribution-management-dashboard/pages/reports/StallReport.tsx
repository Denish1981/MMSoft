import React, { useState, useMemo } from 'react';
import type { StallRegistration } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, AmountInput, SelectInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { formatCurrency, formatUTCDate } from '../../utils/formatting';
import { formatReceiptNo, matchesReceiptFilter, ReceiptData } from '../../utils/receiptUtils';
import { ReceiptModal } from '../../components/ReceiptModal';
import { useData } from '../../contexts/DataContext';
import { Receipt } from 'lucide-react';

interface StallReportProps {
    stallRegistrations: StallRegistration[];
}

interface StallFilters {
    receiptNo: string;
    registrantName: string;
    contactNumber: string;
    needsElectricity: string;
    status: string;
    amountComparator: string;
    amountValue: string;
}

const StallReport: React.FC<StallReportProps> = ({ stallRegistrations }) => {
    const { festivals } = useData();
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    const [filters, setFilters] = useState<StallFilters>({
        receiptNo: '',
        registrantName: '',
        contactNumber: '',
        needsElectricity: '',
        status: '',
        amountComparator: '>=',
        amountValue: '',
    });
    const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            receiptNo: '',
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
            if (filters.receiptNo && !matchesReceiptFilter(r.id, 'stall', filters.receiptNo)) return false;
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

    const openReceipt = (r: StallRegistration) => {
        const rData: ReceiptData = {
            receiptNo: formatReceiptNo(r.id, 'stall'),
            category: 'stall',
            title: 'Stall Registration Fee',
            date: r.submittedAt,
            payerName: r.registrantName,
            payerPhone: r.contactNumber,
            amount: Number(r.totalPayment),
            paymentMode: 'Stall Fee',
            festivalOrCampaign: (r.festivalId && festivalMap.get(r.festivalId)) || 'Festival Stall',
            status: r.status || 'Approved',
            details: [
                { label: 'Number of Tables', value: String(r.numberOfTables || 1) },
                { label: 'Electricity Required', value: r.needsElectricity ? 'Yes' : 'No' },
                { label: 'Stall Dates', value: r.stallDates?.map(d => formatUTCDate(d)).join(', ') || 'N/A' },
                { label: 'Products Offered', value: r.products?.map(p => p.productName).join(', ') || 'N/A' },
            ]
        };
        setSelectedReceipt(rData);
    };

    const handleExport = () => {
        const dataToExport = filteredRegistrations.map(r => ({
            'Receipt No': formatReceiptNo(r.id, 'stall'),
            'Registrant Name': r.registrantName,
            'Contact Number': r.contactNumber,
            'Needs Electricity': r.needsElectricity ? 'Yes' : 'No',
            'Number of Tables': r.numberOfTables,
            'Stall Dates': r.stallDates.map(d => formatUTCDate(d)).join(', '),
            'Products': r.products.map(p => `${p.productName} (${formatCurrency(p.price || 0)})`).join(', '),
            'Total Payment': r.totalPayment,
            'Status': r.status,
            'Registered On': new Date(r.submittedAt).toLocaleDateString(),
        }));
        exportToCsv(dataToExport, 'stall_report');
    };

    return (
        <ReportContainer title="Stall Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Receipt No" value={filters.receiptNo} onChange={val => handleFilterChange('receiptNo', val)} placeholder="e.g. REC-STL-00001" />
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Registrant Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Electricity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tables</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Payment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stall Dates</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredRegistrations.length > 0 ? filteredRegistrations.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold font-mono text-blue-700">
                                    {formatReceiptNo(r.id, 'stall')}
                                </td>
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
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={() => openReceipt(r)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                                        title="View / Download Printable Receipt"
                                    >
                                        <Receipt className="w-3.5 h-3.5" /> View
                                    </button>
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={9} className="text-center py-10 text-slate-500">
                                    {stallRegistrations.length === 0 ? "No stall registrations have been added yet." : "No stall registrations match your current filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        </ReportContainer>
    );
};

export default StallReport;
