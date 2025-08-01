
import React, { useState, useEffect } from 'react';
import type { Contribution, Campaign } from '../types';
import { generateContributionSummary } from '../services/geminiService';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import { API_URL } from '../config';

const AiInsights: React.FC = () => {
    const [period, setPeriod] = useState('7');
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);

    useEffect(() => {
        // Fetch the data required for this page
        const fetchData = async () => {
            try {
                const [contributionsRes, campaignsRes] = await Promise.all([
                    fetch(`${API_URL}/contributions`),
                    fetch(`${API_URL}/campaigns`)
                ]);
                setContributions(await contributionsRes.json());
                setCampaigns(await campaignsRes.json());
            } catch (error) {
                console.error("Failed to fetch data for AI Insights:", error);
            }
        };
        fetchData();
    }, []);

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setSummary('');
        const periodText = period === 'all' ? 'all time' : `the last ${period} days`;
        
        const cutoffDate = new Date();
        if (period !== 'all') {
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(period, 10));
        }
        const filteredContributions = period === 'all' 
            ? contributions 
            : contributions.filter(d => new Date(d.date) >= cutoffDate);

        const result = await generateContributionSummary(filteredContributions, campaigns, periodText);
        setSummary(result);
        setIsLoading(false);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-4xl mx-auto">
            <div className="text-center">
                <SparklesIcon className="w-12 h-12 mx-auto text-blue-500" />
                <h2 className="mt-2 text-2xl font-bold text-slate-800">AI-Powered Contribution Analysis</h2>
                <p className="mt-2 text-slate-600">
                    Get an instant summary of your contribution activity. Select a period and let our AI assistant provide you with key insights.
                </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <select 
                    value={period} 
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="all">All Time</option>
                </select>
                <button
                    onClick={handleGenerateSummary}
                    disabled={isLoading || contributions.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate Summary
                        </>
                    )}
                </button>
            </div>
            {summary && (
                <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Analysis Results</h3>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{summary}</p>
                </div>
            )}
        </div>
    );
};

export default AiInsights;
