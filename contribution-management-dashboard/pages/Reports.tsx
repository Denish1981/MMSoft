import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContributionReport from './reports/ContributionReport';
import VendorReport from './reports/VendorReport';
import ExpenseReport from './reports/ExpenseReport';
import QuotationReport from './reports/QuotationReport';
import BudgetReport from './reports/BudgetReport';
import TaskReport from './reports/TaskReport';
import SponsorReport from './reports/SponsorReport';
import StallReport from './reports/StallReport';
import MiscellaneousReport from './reports/MiscellaneousReport';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

type ReportTab = 'contributions' | 'sponsors' | 'stalls' | 'miscellaneous' | 'vendors' | 'expenses' | 'quotations' | 'budget' | 'tasks';
const VALID_TABS: ReportTab[] = ['contributions', 'sponsors', 'stalls', 'miscellaneous', 'vendors', 'expenses', 'quotations', 'budget', 'tasks'];

const Reports: React.FC = () => {
    const { 
        contributions, sponsors, vendors, expenses, 
        quotations, budgets, festivals, tasks, users,
        stallRegistrations,
        campaigns, selectedCampaignId, setSelectedCampaignId 
    } = useData();
    const { openHistoryModal } = useModal();
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

    const filteredData = useMemo(() => {
        const campId = selectedCampaignId === 'all' ? null : Number(selectedCampaignId);
        
        const filteredFestivals = campId !== null 
            ? festivals.filter(f => f.campaignId === campId)
            : festivals;
        
        const festivalIds = new Set(filteredFestivals.map(f => f.id));

        return {
            contributions: campId !== null 
                ? contributions.filter(c => c.campaignId === campId) 
                : contributions,
            sponsors: campId !== null 
                ? sponsors.filter(s => s.campaignId === campId) 
                : sponsors,
            stallRegistrations: campId !== null
                ? stallRegistrations.filter(r => festivalIds.has(r.festivalId))
                : stallRegistrations,
            expenses: campId !== null 
                ? expenses.filter(e => e.festivalId && festivalIds.has(e.festivalId)) 
                : expenses,
            quotations: campId !== null 
                ? quotations.filter(q => q.festivalId && festivalIds.has(q.festivalId)) 
                : quotations,
            budgets: campId !== null 
                ? budgets.filter(b => b.festivalId && festivalIds.has(b.festivalId)) 
                : budgets,
            tasks: campId !== null 
                ? tasks.filter(t => t.festivalId && festivalIds.has(t.festivalId)) 
                : tasks,
            festivals: filteredFestivals,
        };
    }, [selectedCampaignId, contributions, sponsors, stallRegistrations, expenses, quotations, budgets, tasks, festivals]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'contributions':
                return <ContributionReport contributions={filteredData.contributions.filter(c => c.type !== 'Miscellaneous' && !c.type?.startsWith('Miscellaneous:'))} />;
            case 'sponsors':
                return <SponsorReport sponsors={filteredData.sponsors} />;
            case 'stalls':
                return <StallReport stallRegistrations={filteredData.stallRegistrations} />;
            case 'miscellaneous':
                return <MiscellaneousReport contributions={filteredData.contributions} />;
            case 'vendors':
                return <VendorReport vendors={vendors} />;
            case 'expenses':
                return <ExpenseReport expenses={filteredData.expenses} vendors={vendors} festivals={filteredData.festivals} />;
            case 'quotations':
                return <QuotationReport quotations={filteredData.quotations} vendors={vendors} festivals={filteredData.festivals} />;
            case 'budget':
                return <BudgetReport budgets={filteredData.budgets} expenses={filteredData.expenses} festivals={filteredData.festivals} />;
            case 'tasks':
                return <TaskReport tasks={filteredData.tasks} festivals={filteredData.festivals} users={users} onViewHistory={openHistoryModal} />;
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
            <div className="flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reports</h1>
                    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200 min-w-[240px]">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Active Campaign:</span>
                        <select
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer text-slate-700 w-full"
                        >
                            <option value="all">All Campaigns</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.financialYear})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white p-2 rounded-lg shadow-sm overflow-x-auto">
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                        <TabButton tabName="contributions" label="Contribution Report" />
                        <TabButton tabName="sponsors" label="Sponsor Report" />
                        <TabButton tabName="stalls" label="Stall Report" />
                        <TabButton tabName="miscellaneous" label="Miscellaneous Report" />
                        <TabButton tabName="vendors" label="Vendor Report" />
                        <TabButton tabName="expenses" label="Expense Report" />
                        <TabButton tabName="quotations" label="Quotation Report" />
                        <TabButton tabName="budget" label="Budget Report" />
                        <TabButton tabName="tasks" label="Task Report" />
                    </div>
                </div>
            </div>
            <div>{renderTabContent()}</div>
        </div>
    );
};

export default Reports;
