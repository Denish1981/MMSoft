
import React, { useMemo } from 'react';
import DashboardCard from '../components/DashboardCard';
import AreaChartComponent from '../components/AreaChartComponent';
import type { Contribution, Donor, Sponsor, Expense } from '../types';
import { ContributionIcon } from '../components/icons/DonateIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { BriefcaseIcon } from '../components/icons/BriefcaseIcon';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import { formatCurrency } from '../utils/formatting';
import { CashIcon } from '../components/icons/CashIcon';

interface DashboardProps {
    contributions: Contribution[];
    donors: Donor[];
    sponsors: Sponsor[];
    expenses: Expense[];
}

const Dashboard: React.FC<DashboardProps> = ({ contributions, donors, sponsors, expenses }) => {
    const totalContributions = useMemo(() => {
        return contributions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [contributions]);

    const totalCashContributions = useMemo(() => {
        return contributions
            .filter(c => c.type === 'Cash')
            .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    }, [contributions]);

    const totalExpenses = useMemo(() => {
        return expenses.reduce((acc, e) => acc + (Number(e.cost) || 0), 0);
    }, [expenses]);

    const totalSponsorshipsAmount = useMemo(() => {
        return sponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
    }, [sponsors]);

    const contributionChartData = useMemo(() => {
        const dataMap: { [key: string]: number } = {};
        contributions.forEach(c => {
            const date = new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dataMap[date] = (dataMap[date] || 0) + (Number(c.amount) || 0);
        });
        return Object.entries(dataMap)
            .map(([name, value]) => ({ name, contributions: value }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
            .slice(-30);
    }, [contributions]);

    const expenseChartData = useMemo(() => {
        const dataMap: { [key: string]: number } = {};
        expenses.forEach(e => {
            const date = new Date(e.billDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dataMap[date] = (dataMap[date] || 0) + (Number(e.cost) || 0);
        });
        return Object.entries(dataMap)
            .map(([name, value]) => ({ name, expenses: value }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
            .slice(-30);
    }, [expenses]);
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard title="Total Contributions" value={formatCurrency(totalContributions, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={<ContributionIcon className="w-6 h-6" />} change="+5.2%" changeType='increase' />
                <DashboardCard title="Cash Balance" value={formatCurrency(totalCashContributions, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={<CashIcon className="w-6 h-6" />} change="+1.8%" changeType='increase' />
                <DashboardCard title="Total Expenses" value={formatCurrency(totalExpenses, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={<ReceiptIcon className="w-6 h-6" />} change="+2.5%" changeType='decrease' />
                <DashboardCard title="Sponsorships Raised" value={formatCurrency(totalSponsorshipsAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={<BriefcaseIcon className="w-6 h-6" />} change="+8%" changeType='increase' />
                <DashboardCard title="Total Donors" value={donors.length} icon={<UsersIcon className="w-6 h-6" />} change="+12" changeType='increase' />
                <DashboardCard title="Total Sponsors" value={sponsors.length} icon={<BriefcaseIcon className="w-6 h-6" />} change="+3" changeType='increase' />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AreaChartComponent 
                        data={contributionChartData}
                        title="Contributions Over Time"
                        dataKey="contributions"
                        strokeColor="#3b82f6"
                        gradientId="colorContributions"
                        gradientColor="#3b82f6"
                        gradientOpacity={0.8}
                        tooltipLabel="Contributions"
                    />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                     <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Donors</h3>
                     <div className="space-y-1">
                        {donors.slice(0, 10).map(donor => (
                            <div key={donor.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{donor.name}</p>
                                    <p className="text-xs text-slate-500">{`T-${donor.towerNumber}, F-${donor.flatNumber}`}</p>
                                </div>
                                <span className="text-sm font-semibold text-slate-900">{formatCurrency(donor.totalContributed)}</span>
                            </div>
                        ))}
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <AreaChartComponent 
                    data={expenseChartData}
                    title="Expenses Over Time"
                    dataKey="expenses"
                    strokeColor="#ef4444"
                    gradientId="colorExpenses"
                    gradientColor="#ef4444"
                    gradientOpacity={0.7}
                    tooltipLabel="Expenses"
                />
            </div>
        </div>
    );
};

export default Dashboard;
