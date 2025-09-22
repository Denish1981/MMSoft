import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryCard from '../components/SummaryCard';
import type { Contribution, Donor, Sponsor, Expense, Vendor } from '../types/index';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import { CalculatorIcon } from '../components/icons/CalculatorIcon';
import { AlertTriangleIcon } from '../components/icons/AlertTriangleIcon';
import { formatCurrency } from '../utils/formatting';
import { useData } from '../contexts/DataContext';

const Dashboard: React.FC = () => {
    const { contributions, donors, sponsors, expenses, vendors, festivals } = useData();
    const [selectedFestivalId, setSelectedFestivalId] = useState<string>('all');
    
    const totalContributions = useMemo(() => {
        return contributions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }, [contributions]);

    const totalSponsorshipsAmount = useMemo(() => {
        return sponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
    }, [sponsors]);
    
    const totalRaised = useMemo(() => {
        return totalContributions + totalSponsorshipsAmount;
    }, [totalContributions, totalSponsorshipsAmount]);
    
    const fundsBreakdown = [
        { label: 'Contributions', value: totalContributions, color: 'bg-green-500', path: '/reports?tab=contributions' },
        { label: 'Sponsorships', value: totalSponsorshipsAmount, color: 'bg-indigo-500', path: '/reports?tab=sponsors' },
    ];

    const filteredExpenses = useMemo(() => {
        if (selectedFestivalId === 'all') {
            return expenses;
        }
        const festivalId = Number(selectedFestivalId);
        return expenses.filter(e => e.festivalId === festivalId);
    }, [expenses, selectedFestivalId]);

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
                path: `/reports?tab=expenses&expenseHead=${encodeURIComponent(label)}`
            }));
    }, [filteredExpenses]);

    const outstandingPayments = useMemo(() => {
        const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
        return expenses
            .filter(e => e.outstandingAmount && e.outstandingAmount > 0)
            .map(e => ({
                ...e,
                vendorName: vendorMap.get(e.vendorId) || 'Unknown Vendor',
            }))
            .sort((a, b) => (b.outstandingAmount || 0) - (a.outstandingAmount || 0));
    }, [expenses, vendors]);

    const totalOutstanding = useMemo(() => {
        return outstandingPayments.reduce((acc, payment) => acc + (payment.outstandingAmount || 0), 0);
    }, [outstandingPayments]);

    const expenseFilterDropdown = (
        <select
            value={selectedFestivalId}
            onChange={(e) => setSelectedFestivalId(e.target.value)}
            className="text-xs p-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            onClick={(e) => e.stopPropagation()}
            aria-label="Filter expenses by festival"
        >
            <option value="all">All Festivals</option>
            {festivals.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
            ))}
        </select>
    );

    return (
        <div className="space-y-8">
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
        </div>
    );
};

export default Dashboard;