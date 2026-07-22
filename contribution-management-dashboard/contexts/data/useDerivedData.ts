import { useMemo } from 'react';
import type { Contribution, Expense, Festival, Donor } from '../../types/index';

export function useDerivedData(
    contributions: Contribution[],
    expenses: Expense[],
    festivals: Festival[]
) {
    const donors = useMemo((): Donor[] => {
        const donorMap = new Map<string, Donor>();
        [...contributions].reverse().forEach(contribution => {
            if (!contribution || !contribution.donorName || !contribution.towerNumber || !contribution.flatNumber) return;
            const donorId = `${contribution.donorName.toLowerCase().replace(/\s/g, '-')}-${contribution.towerNumber}-${contribution.flatNumber}`;
            let donor = donorMap.get(donorId);
            if (!donor) {
                donor = {
                    id: donorId,
                    name: contribution.donorName,
                    towerNumber: contribution.towerNumber,
                    flatNumber: contribution.flatNumber,
                    totalContributed: 0,
                    contributionCount: 0,
                    email: contribution.donorEmail,
                    mobileNumber: contribution.mobileNumber,
                };
            } else {
                if (contribution.donorEmail) donor.email = contribution.donorEmail;
                if (contribution.mobileNumber) donor.mobileNumber = contribution.mobileNumber;
            }
            donor.totalContributed += (Number(contribution.amount) || 0);
            donor.contributionCount += 1;
            donorMap.set(donorId, donor);
        });
        return Array.from(donorMap.values()).sort((a, b) => b.totalContributed - a.totalContributed);
    }, [contributions]);

    const expenseHeads = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseHead))), [expenses]);
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    return {
        donors,
        expenseHeads,
        festivalMap,
    };
}
