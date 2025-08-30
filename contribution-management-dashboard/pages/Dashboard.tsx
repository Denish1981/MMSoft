import React, { useMemo } from 'react';
import SummaryCard from '../components/SummaryCard';
import type { Contribution, Donor, Sponsor, Expense } from '../types';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import { CalculatorIcon } from '../components/icons/CalculatorIcon';

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

    const totalExpenses = useMemo(() => {
        return expenses.reduce((acc, e) => acc + (Number(e.cost) || 0), 0);
    }, [expenses]);

    const totalSponsorshipsAmount = useMemo(() => {
        return sponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
    }, [sponsors]);
    
    const totalRaised = useMemo(() => {
        return totalContributions + totalSponsorshipsAmount;
    }, [totalContributions, totalSponsorshipsAmount]);
    
    const fundsBreakdown = [
        { label: 'Contributions', value: totalContributions, color: 'bg-green-500' },
        { label: 'Sponsorships', value: totalSponsorshipsAmount, color: 'bg-indigo-500' },
    ];

    const expenseBreakdown = useMemo(() => {
        const expenseMap = new Map<string, number>();
        expenses.forEach(expense => {
            const head = expense.expenseHead || 'Uncategorized';
            const currentTotal = expenseMap.get(head) || 0;
            expenseMap.set(head, currentTotal + (Number(expense.cost) || 0));
        });

        const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-cyan-500', 'bg-fuchsia-500'];
        
        return Array.from(expenseMap.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([label, value], index) => ({
                label,
                value,
                color: colors[index % colors.length]
            }));
    }, [expenses]);

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
                />
            </div>
        </div>
    );
};

export default Dashboard;