import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryCard from '../components/SummaryCard';
import type { Contribution, Donor, Sponsor, Expense, Vendor } from '../types/index';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import { CalculatorIcon } from '../components/icons/CalculatorIcon';
import { AlertTriangleIcon } from '../components/icons/AlertTriangleIcon';
import { CashIcon } from '../components/icons/CashIcon';
import { formatCurrency } from '../utils/formatting';
import { useData } from '../contexts/DataContext';

const Dashboard: React.FC = () => {
    const { contributions, campaigns, donors, sponsors, expenses, vendors, festivals, selectedCampaignId, setSelectedCampaignId } = useData();
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

    const totalContributions = useMemo(() => {
        return filteredContributions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [filteredContributions]);

    const totalSponsorshipsAmount = useMemo(() => {
        return filteredSponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
    }, [filteredSponsors]);
    
    const totalRaised = useMemo(() => {
        return totalContributions + totalSponsorshipsAmount;
    }, [totalContributions, totalSponsorshipsAmount]);
    
    const fundsBreakdown = [
        { label: 'Contributions', value: totalContributions, color: 'bg-green-500', path: `/reports?tab=contributions${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}` },
        { label: 'Sponsorships', value: totalSponsorshipsAmount, color: 'bg-indigo-500', path: `/reports?tab=sponsors${selectedCampaignId !== 'all' ? `&campaignId=${selectedCampaignId}` : ''}` },
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
        return filteredExpenses // Use filtered expenses here too
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

    const campaignFilterDropdown = (
        <select
            value={selectedCampaignId}
            onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                setSelectedFestivalId('all'); // Reset festival filter when campaign changes
            }}
            className="text-xs p-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            onClick={(e) => e.stopPropagation()}
            aria-label="Filter by campaign"
        >
            <option value="all">All Campaigns</option>
            {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.financialYear})</option>
            ))}
        </select>
    );

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
            <div className="flex justify-end">
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                    <span className="text-sm font-medium text-slate-600">Global Filter:</span>
                    {campaignFilterDropdown}
                </div>
            </div>

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

            {/* Outstanding Payments Gadget */}
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                        <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full mr-4">
                            <AlertTriangleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Outstanding Payments</h3>
                            <p className="text-sm text-slate-500">
                                {outstandingPayments.length > 0 ? `${outstandingPayments.length} pending payments` : 'All payments are up to date'}
                            </p>
                        </div>
                    </div>
                    {outstandingPayments.length > 0 && (
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalOutstanding)}
                            </p>
                        </div>
                    )}
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {outstandingPayments.length > 0 ? (
                        outstandingPayments.map(payment => (
                            <Link to="/expenses" key={payment.id} className="block p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-slate-700">{payment.name}</p>
                                        <p className="text-xs text-slate-500">{payment.vendorName}</p>
                                    </div>
                                    <p className="font-bold text-red-600">
                                        {formatCurrency(payment.outstandingAmount || 0)}
                                    </p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            <p className="font-semibold">All Clear!</p>
                            <p className="text-sm">No outstanding expense payments found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Carry Forward Balance Widget */}
            <div className={`p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ${carryForwardBalance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} border`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center">
                        <div className={`${carryForwardBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} p-4 rounded-full mr-4 shadow-sm`}>
                            <CashIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Carry Forward Balance</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                {carryForwardBalance >= 0 
                                    ? 'Surplus funds available to be carried forward' 
                                    : 'Net deficit for the selected period'}
                            </p>
                        </div>
                    </div>
                    <div className="text-center md:text-right px-4 py-2 rounded-lg bg-white/50 border border-white/50 backdrop-blur-sm shadow-inner min-w-[200px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Estimated Balance</p>
                        <p className={`text-4xl font-extrabold tracking-tight ${carryForwardBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(carryForwardBalance)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;