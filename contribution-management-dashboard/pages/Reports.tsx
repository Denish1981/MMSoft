

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Contribution, Vendor, Expense, Quotation, Budget, Festival, Task, UserForManagement, Sponsor } from '../types';
import ContributionReport from './reports/ContributionReport';
import VendorReport from './reports/VendorReport';
import ExpenseReport from './reports/ExpenseReport';
import QuotationReport from './reports/QuotationReport';
import BudgetReport from './reports/BudgetReport';
import TaskReport from './reports/TaskReport';
import SponsorReport from './reports/SponsorReport';

interface ReportsProps {
    contributions: Contribution[];
    sponsors: Sponsor[];
    vendors: Vendor[];
    expenses: Expense[];
    quotations: Quotation[];
    budgets: Budget[];
    festivals: Festival[];
    tasks: Task[];
    users: UserForManagement[];
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

type ReportTab = 'contributions' | 'sponsors' | 'vendors' | 'expenses' | 'quotations' | 'budget' | 'tasks';
const VALID_TABS: ReportTab[] = ['contributions', 'sponsors', 'vendors', 'expenses', 'quotations', 'budget', 'tasks'];

const Reports: React.FC<ReportsProps> = ({
    contributions, sponsors, vendors, expenses, quotations, budgets, festivals, tasks, users, onViewHistory
}) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const getActiveTab = (): ReportTab => {
        const tab = searchParams.get('tab');
        if (tab && VALID_TABS.includes(tab as ReportTab)) {
            return tab as ReportTab;
        }
        return 'contributions';
    };

    const [activeTab, setActiveTab] = useState<ReportTab>(getActiveTab());
    
    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [searchParams]);

    const handleTabClick = (tabName: ReportTab) => {
        setActiveTab(tabName);
        setSearchParams({ tab: tabName });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'contributions':
                return <ContributionReport contributions={contributions} />;
            case 'sponsors':
                return <SponsorReport sponsors={sponsors} />;
            case 'vendors':
                return <VendorReport vendors={vendors} />;
            case 'expenses':
                return <ExpenseReport expenses={expenses} vendors={vendors} festivals={festivals} />;
            case 'quotations':
                return <QuotationReport quotations={quotations} vendors={vendors} festivals={festivals} />;
            case 'budget':
                return <BudgetReport budgets={budgets} expenses={expenses} festivals={festivals} />;
            case 'tasks':
                return <TaskReport tasks={tasks} festivals={festivals} users={users} onViewHistory={onViewHistory} />;
            default:
                return null;
        }
    };

    const TabButton: React.FC<{ tabName: ReportTab; label: string }> = ({ tabName, label }) => {
        const isActive = activeTab === tabName;
        return (
            <button
                onClick={() => handleTabClick(tabName)}
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
                <div className="flex items-center space-x-2 flex-wrap">
                    <TabButton tabName="contributions" label="Contribution Report" />
                    <TabButton tabName="sponsors" label="Sponsor Report" />
                    <TabButton tabName="vendors" label="Vendor Report" />
                    <TabButton tabName="expenses" label="Expense Report" />
                    <TabButton tabName="quotations" label="Quotation Report" />
                    <TabButton tabName="budget" label="Budget Report" />
                    <TabButton tabName="tasks" label="Task Report" />
                </div>
            </div>
            <div>{renderTabContent()}</div>
        </div>
    );
};

export default Reports;