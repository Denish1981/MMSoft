
import React, { useState } from 'react';
import type { Contribution, Vendor, Expense, Quotation } from '../types';
import ContributionReport from './reports/ContributionReport';
import VendorReport from './reports/VendorReport';
import ExpenseReport from './reports/ExpenseReport';
import QuotationReport from './reports/QuotationReport';

interface ReportsProps {
    contributions: Contribution[];
    vendors: Vendor[];
    expenses: Expense[];
    quotations: Quotation[];
}

type ReportTab = 'contributions' | 'vendors' | 'expenses' | 'quotations';

const Reports: React.FC<ReportsProps> = ({ contributions, vendors, expenses, quotations }) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('contributions');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'contributions':
                return <ContributionReport contributions={contributions} />;
            case 'vendors':
                return <VendorReport vendors={vendors} />;
            case 'expenses':
                return <ExpenseReport expenses={expenses} vendors={vendors} />;
            case 'quotations':
                return <QuotationReport quotations={quotations} vendors={vendors} />;
            default:
                return null;
        }
    };

    const TabButton: React.FC<{ tabName: ReportTab; label: string }> = ({ tabName, label }) => {
        const isActive = activeTab === tabName;
        return (
            <button
                onClick={() => setActiveTab(tabName)}
                className={`px-4 py-2 font-medium text-sm rounded-md transition-colors duration-200 ${
                    isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                    <TabButton tabName="contributions" label="Contribution Report" />
                    <TabButton tabName="vendors" label="Vendor Report" />
                    <TabButton tabName="expenses" label="Expense Report" />
                    <TabButton tabName="quotations" label="Quotation Report" />
                </div>
            </div>
            <div>{renderTabContent()}</div>
        </div>
    );
};

export default Reports;
