
import React, { useMemo } from 'react';
import DashboardCard from '../components/DashboardCard';
import AreaChartComponent from '../components/AreaChartComponent';
import type { Contribution, Donor, Sponsor } from '../types';
import { ContributionIcon } from '../components/icons/DonateIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { BriefcaseIcon } from '../components/icons/BriefcaseIcon';
import { formatCurrency } from '../utils/formatting';

interface DashboardProps {
    contributions: Contribution[];
    donors: Donor[];
    sponsors: Sponsor[];
}

const Dashboard: React.FC<DashboardProps> = ({ contributions, donors, sponsors }) => {
    const totalContributions = useMemo(() => {
        return contributions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [contributions]);

    const totalSponsorshipsAmount = useMemo(() => {
        return sponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
    }, [sponsors]);

    const chartData = useMemo(() => {
        const data: { [key: string]: number } = {};
        const sortedContributions = [...contributions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedContributions.forEach(contribution => {
            const date = new Date(contribution.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!data[date]) {
                data[date] = 0;
            }
            data[date] += (Number(contribution.amount) || 0);
        });

        return Object.keys(data).map(date => ({
            name: date,
            contributions: data[date]
        })).slice(-30); // Last 30 days/entries
    }, [contributions]);
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Total Contributions" value={formatCurrency(totalContributions, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={<ContributionIcon className="w-6 h-6" />} change="+5.2%" changeType='increase' />
                <DashboardCard title="Sponsorships Raised" value={formatCurrency(totalSponsorshipsAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={<BriefcaseIcon className="w-6 h-6" />} change="+8%" changeType='increase' />
                <DashboardCard title="Total Donors" value={donors.length} icon={<UsersIcon className="w-6 h-6" />} change="+12" changeType='increase' />
                <DashboardCard title="Total Sponsors" value={sponsors.length} icon={<BriefcaseIcon className="w-6 h-6" />} change="+3" changeType='increase' />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AreaChartComponent data={chartData} />
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
        </div>
    );
};

export default Dashboard;
