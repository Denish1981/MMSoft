import React, { useMemo, useState } from 'react';
import SummaryCard from '../components/SummaryCard';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import { CalculatorIcon } from '../components/icons/CalculatorIcon';
import { useData } from '../contexts/DataContext';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { OutstandingPaymentsWidget } from '../components/dashboard/OutstandingPaymentsWidget';
import { CarryForwardBalanceWidget } from '../components/dashboard/CarryForwardBalanceWidget';

const Dashboard: React.FC = () => {
    const { contributions, campaigns, sponsors, expenses, vendors, festivals, selectedCampaignId, setSelectedCampaignId } = useData();
    const [selectedFestivalId, setSelectedFestivalId] = useState<string>('all');
    
    // Auto-reset festival filter if campaign changes, or keep it if still valid
    const filteredFestivals = useMemo(() => {
        if (selectedCampaignId === 'all') return festivals;
        const campId = Number(selectedCampaignId);
        return festivals.filter(f => f.campaignId === campId);
    }, [festivals, selectedCampaignId]);

    const filteredContributions = useMemo(() => {
        if (selectedCampaignId === 'all') return contributions;
        const campId = Number(selectedCampaignId);
        return contributions.filter(c => c.campaignId === campId);
    }, [contributions, selectedCampaignId]);

    const filteredSponsors = useMemo(() => {
        if (selectedCampaignId === 'all') return sponsors;
        const campId = Number(selectedCampaignId);
        return sponsors.filter(s => s.campaignId === campId);
    }, [sponsors, selectedCampaignId]);

    const filteredContributionsOnly = useMemo(() => {
        return filteredContributions.filter(c => !c.stallRegistrationId && c.type !== 'Stall Fee' && c.type !== 'Miscellaneous' && !c.type?.startsWith('Miscellaneous:'));
    }, [filteredContributions]);

    const filteredStallRevenue = useMemo(() => {
        return filteredContributions.filter(c => c.stallRegistrationId || c.type === 'Stall Fee');
    }, [filteredContributions]);

    const filteredMiscellaneous = useMemo(() => {
        return filteredContributions.filter(c => c.type === 'Miscellaneous' || c.type?.startsWith('Miscellaneous:'));
    }, [filteredContributions]);

    const totalContributions = useMemo(() => {
        return filteredContributionsOnly.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [filteredContributionsOnly]);

    const totalStallRevenue = useMemo(() => {
        return filteredStallRevenue.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [filteredStallRevenue]);

    const totalMiscellaneous = useMemo(() => {
        return filteredMiscellaneous.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [filteredMiscellaneous]);

    const totalSponsorshipsAmount = useMemo(() => {
        return filteredSponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
    }, [filteredSponsors]);
    
    const totalRaised = useMemo(() => {
        return totalContributions + totalSponsorshipsAmount + totalStallRevenue + totalMiscellaneous;
    }, [totalContributions, totalSponsorshipsAmount, totalStallRevenue, totalMiscellaneous]);
    
    const fundsBreakdown = [
        { label: 'Contributions', value: totalContributions, color: 'bg-green-500', path: `/reports?tab=contributions${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}` },
        { label: 'Sponsorships', value: totalSponsorshipsAmount, color: 'bg-indigo-500', path: `/reports?tab=sponsors${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}` },
        { label: 'Stalls', value: totalStallRevenue, color: 'bg-cyan-500', path: `/reports?tab=stalls${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}` },
        { label: 'Miscellaneous', value: totalMiscellaneous, color: 'bg-purple-500', path: `/reports?tab=miscellaneous${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}` },
    ];

    const filteredExpenses = useMemo(() => {
        let baseExpenses = expenses;
        
        // Filter by Campaign (via festivals)
        if (selectedCampaignId !== 'all') {
            const campId = Number(selectedCampaignId);
            const campaignFestivalIds = festivals.filter(f => f.campaignId === campId).map(f => f.id);
            baseExpenses = baseExpenses.filter(e => e.festivalId && campaignFestivalIds.includes(e.festivalId));
        }

        // Filter by Festival
        if (selectedFestivalId !== 'all') {
            const festivalId = Number(selectedFestivalId);
            baseExpenses = baseExpenses.filter(e => e.festivalId === festivalId);
        }
        
        return baseExpenses;
    }, [expenses, selectedCampaignId, selectedFestivalId, festivals]);

    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((acc, e) => acc + (Number(e.totalCost) || 0), 0);
    }, [filteredExpenses]);

    const expenseBreakdown = useMemo(() => {
        const expenseMap = new Map<string, number>();
        filteredExpenses.forEach(expense => {
            const head = expense.expenseHead || 'Uncategorized';
            const currentTotal = expenseMap.get(head) || 0;
            expenseMap.set(head, currentTotal + (Number(expense.totalCost) || 0));
        });

        const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-cyan-500', 'bg-fuchsia-500'];
        
        return Array.from(expenseMap.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([label, value], index) => ({
                label,
                value,
                color: colors[index % colors.length],
                path: `/reports?tab=expenses&expenseHead=${encodeURIComponent(label)}${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}${selectedFestivalId !== 'all' ? `&festivalId=${selectedFestivalId}` : ''}`
            }));
    }, [filteredExpenses, selectedCampaignId, selectedFestivalId]);

    const outstandingPayments = useMemo(() => {
        const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
        return filteredExpenses
            .filter(e => e.outstandingAmount && e.outstandingAmount > 0)
            .map(e => ({
                ...e,
                vendorName: vendorMap.get(e.vendorId) || 'Unknown Vendor',
            }))
            .sort((a, b) => (b.outstandingAmount || 0) - (a.outstandingAmount || 0));
    }, [filteredExpenses, vendors]);

    const totalOutstanding = useMemo(() => {
        return outstandingPayments.reduce((acc, payment) => acc + (payment.outstandingAmount || 0), 0);
    }, [outstandingPayments]);

    const carryForwardBalance = useMemo(() => {
        return totalRaised - totalExpenses;
    }, [totalRaised, totalExpenses]);

    const expenseFilterDropdown = (
        <select
            value={selectedFestivalId}
            onChange={(e) => setSelectedFestivalId(e.target.value)}
            className="text-xs p-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            onClick={(e) => e.stopPropagation()}
            aria-label="Filter expenses by festival"
        >
            <option value="all">All Festivals</option>
            {filteredFestivals.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
            ))}
        </select>
    );

    return (
        <div className="space-y-6">
            <DashboardHeader
                selectedCampaignId={selectedCampaignId}
                setSelectedCampaignId={setSelectedCampaignId}
                setSelectedFestivalId={setSelectedFestivalId}
                campaigns={campaigns}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SummaryCard
                    title="Total Funds Raised"
                    totalValue={totalRaised}
                    icon={<CalculatorIcon className="w-6 h-6" />}
                    breakdown={fundsBreakdown}
                />
                <SummaryCard
                    title="Total Expenses"
                    totalValue={totalExpenses}
                    icon={<ReceiptIcon className="w-6 h-6" />}
                    breakdown={expenseBreakdown}
                    headerControls={expenseFilterDropdown}
                />
            </div>

            <OutstandingPaymentsWidget
                outstandingPayments={outstandingPayments}
                totalOutstanding={totalOutstanding}
            />

            <CarryForwardBalanceWidget
                carryForwardBalance={carryForwardBalance}
            />
        </div>
    );
};

export default Dashboard;
