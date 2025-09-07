import React, { useMemo } from 'react';
import type { Campaign, Contribution } from '../types';
import { formatCurrency } from '../utils/formatting';
import { useData } from '../contexts/DataContext';

const Campaigns: React.FC = () => {
    const { campaigns, contributions } = useData();

    const campaignProgress = useMemo(() => {
        return campaigns.map(campaign => {
            const relevantContributions = contributions.filter(d => d.campaignId === campaign.id);
            const raised = relevantContributions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            const progress = campaign.goal > 0 ? Math.min(100, (raised / campaign.goal) * 100) : 0;
            const donorIds = new Set(relevantContributions.map(c => `${c.donorName.toLowerCase().replace(/\s/g, '-')}-${c.towerNumber}-${c.flatNumber}`));
            return { ...campaign, raised, progress, donorCount: donorIds.size };
        });
    }, [campaigns, contributions]);

    return (
        <div className="space-y-6">
            {campaignProgress.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-slate-800">{c.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-700">
                                <span className="font-bold text-blue-600">{formatCurrency(c.raised, { minimumFractionDigits: 0 })}</span> raised of {formatCurrency(c.goal, { minimumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm font-bold text-slate-700">{c.progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                            <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full" style={{ width: `${c.progress}%` }}></div>
                        </div>
                    </div>
                     <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                        <span><span className="font-bold text-slate-700">{c.donorCount}</span> unique donors</span>
                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.progress >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                           {c.progress >= 100 ? 'Goal Reached' : 'In Progress'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Campaigns;
