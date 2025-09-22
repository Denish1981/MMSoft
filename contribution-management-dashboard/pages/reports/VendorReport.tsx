

import React, { useState, useMemo } from 'react';
import type { Vendor } from '../../types/index';
import ReportContainer from './ReportContainer';
import { TextInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';

interface VendorReportProps {
    vendors: Vendor[];
}

interface VendorFilters {
    vendorName: string;
    vendorBusiness: string;
    contactName: string;
}

const VendorReport: React.FC<VendorReportProps> = ({ vendors }) => {
    const [filters, setFilters] = useState<VendorFilters>({
        vendorName: '',
        vendorBusiness: '',
        contactName: '',
    });

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            vendorName: '',
            vendorBusiness: '',
            contactName: '',
        });
    };

    const filteredVendors = useMemo(() => {
        return vendors.filter(v => {
            if (filters.vendorName && !v.name.toLowerCase().includes(filters.vendorName.toLowerCase())) return false;
            if (filters.vendorBusiness && v.business && !v.business.toLowerCase().includes(filters.vendorBusiness.toLowerCase())) return false;
            if (filters.contactName && !v.contacts.some(c => c.name.toLowerCase().includes(filters.contactName.toLowerCase()))) return false;
            return true;
        });
    }, [vendors, filters]);

    const handleExport = () => {
        const dataToExport = filteredVendors.flatMap(v => 
            v.contacts.length > 0 ? v.contacts.map(c => ({
                'Vendor ID': v.id,
                'Vendor Name': v.name,
                'Vendor Business': v.business,
                'Vendor Address': v.address,
                'Contact Name': c.name,
                'Contact Number': c.contactNumber,
            })) : [{
                'Vendor ID': v.id,
                'Vendor Name': v.name,
                'Vendor Business': v.business,
                'Vendor Address': v.address,
                'Contact Name': 'N/A',
                'Contact Number': 'N/A',
            }]
        );
        exportToCsv(dataToExport, 'vendor_report');
    };

    return (
        <ReportContainer title="Vendor Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Vendor Name" value={filters.vendorName} onChange={val => handleFilterChange('vendorName', val)} />
                <TextInput label="Vendor Business" value={filters.vendorBusiness} onChange={val => handleFilterChange('vendorBusiness', val)} />
                <TextInput label="Contact Name" value={filters.contactName} onChange={val => handleFilterChange('contactName', val)} />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacts</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredVendors.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 align-top">{v.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">{v.business}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">{v.address}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 align-top">
                                    <ul className="space-y-1">
                                    {v.contacts.map((contact, index) => (
                                        <li key={index}>
                                            <span className="font-medium text-slate-800">{contact.name}</span> - {contact.contactNumber}
                                        </li>
                                    ))}
                                    </ul>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default VendorReport;
