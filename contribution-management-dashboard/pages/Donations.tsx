
import React, { useState, useMemo, useEffect } from 'react';
import type { Contribution, Campaign } from '../types';
import { ContributionStatus } from '../types';
import { generateThankYouNote } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { CopyIcon } from '../components/icons/CopyIcon';
import { CloseIcon } from '../components/icons/CloseIcon';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { formatCurrency, formatUTCDate } from '../utils/formatting';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import ContributionsNavigation from '../components/ContributionsNavigation';

interface ContributionsProps {
    contributions: Contribution[];
    campaigns: Campaign[];
    onEdit: (contribution: Contribution) => void;
    onDelete: (id: number) => void;
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

const StatusBadge: React.FC<{ status: ContributionStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    const statusClasses = {
        [ContributionStatus.Completed]: "bg-green-100 text-green-800",
        [ContributionStatus.Pending]: "bg-yellow-100 text-yellow-800",
        [ContributionStatus.Failed]: "bg-red-100 text-red-800",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const ThankYouModal: React.FC<{note: string, onClose: () => void}> = ({ note, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(note);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Generated Thank You Note</h2>
                <div className="bg-slate-50 p-4 rounded-md text-slate-700 whitespace-pre-wrap min-h-[150px]">
                    {note}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleCopy} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                        <CopyIcon className="w-5 h-5 mr-2" />
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ImageViewerModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100]" onClick={onClose}>
        <div className="p-4 bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt="Full size contribution" className="max-w-full max-h-[85vh] object-contain" />
             <button onClick={onClose} className="absolute -top-4 -right-4 text-white bg-slate-800 rounded-full p-2">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
    </div>
);


const Contributions: React.FC<ContributionsProps> = ({ contributions, campaigns, onEdit, onDelete, onViewHistory }) => {
    const { token } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampaign, setFilterCampaign] = useState('all');
    const [generatedNote, setGeneratedNote] = useState<string | null>(null);
    const [isLoadingNote, setIsLoadingNote] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const campaignMap = useMemo(() => new Map(campaigns.map(c => [c.id, c.name])), [campaigns]);

    const filteredContributions = useMemo(() => {
        return contributions
            .filter(d => searchTerm === '' || d.donorName.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(d => filterCampaign === 'all' || (d.campaignId !== null && d.campaignId.toString() === filterCampaign));
    }, [contributions, searchTerm, filterCampaign]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCampaign, rowsPerPage]);

    const totalPages = Math.ceil(filteredContributions.length / rowsPerPage);
    const paginatedContributions = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredContributions.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredContributions, currentPage, rowsPerPage]);

    const handleGenerateNote = async (contribution: Contribution) => {
        setIsLoadingNote(true);
        const campaignName = (contribution.campaignId && campaignMap.get(contribution.campaignId)) || "our cause";
        const result = await generateThankYouNote(contribution.donorName, contribution.amount, campaignName, token);
        if (result.note) {
            setGeneratedNote(result.note);
        } else {
            console.error(result.error);
            setGeneratedNote("Failed to generate note. Please try again.");
        }
        setIsLoadingNote(false);
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };
    
    return (
        <div className="space-y-6">
            <ContributionsNavigation />
            <div className="bg-white p-6 rounded-xl shadow-md">
                {isLoadingNote && (
                    <div className="fixed inset-0 bg-white bg-opacity-75 flex flex-col justify-center items-center z-50">
                        <SparklesIcon className="w-12 h-12 text-blue-500 animate-pulse" />
                        <p className="mt-4 text-lg text-slate-700">Generating personal note...</p>
                    </div>
                )}
                {generatedNote && <ThankYouModal note={generatedNote} onClose={() => setGeneratedNote(null)} />}
                {viewingImage && <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}

                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search by donor name..."
                        className="w-full md:w-1/3 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="w-full md:w-1/3 px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        onChange={e => setFilterCampaign(e.target.value)}
                    >
                        <option value="all">All Campaigns</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Donor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Coupons</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedContributions.length > 0 ? paginatedContributions.map(contribution => (
                                <tr key={contribution.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{contribution.donorName}</div>
                                        <div className="text-sm text-slate-500">{contribution.donorEmail}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{formatCurrency(contribution.amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{contribution.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{contribution.numberOfCoupons}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{(contribution.campaignId && campaignMap.get(contribution.campaignId)) || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(contribution.date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {contribution.image ? (
                                            <img 
                                                src={contribution.image} 
                                                alt="Contribution" 
                                                className="h-10 w-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform mx-auto"
                                                onClick={() => setViewingImage(contribution.image!)}
                                            />
                                        ) : (
                                            <span className="text-slate-400 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={contribution.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => handleGenerateNote(contribution)} className="text-blue-600 hover:text-blue-800 flex items-center" title="Generate Thank You Note">
                                               <SparklesIcon className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => onViewHistory('contributions', contribution.id, `History for ${contribution.donorName}'s contribution`)} className="text-slate-500 hover:text-blue-600" title="View History">
                                                <HistoryIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onEdit(contribution)} className="text-slate-600 hover:text-slate-900" title="Edit Contribution">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onDelete(contribution.id)} className="text-red-600 hover:text-red-900" title="Delete Contribution">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} className="text-center py-10 text-slate-500">
                                        {contributions.length === 0 ? "No contributions have been added yet." : "No contributions match your current filters."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-4 border-t border-slate-200 gap-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <span>Rows per page:</span>
                        <select
                            value={rowsPerPage}
                            onChange={e => setRowsPerPage(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            aria-label="Rows per page"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                    <div className="text-sm text-slate-600" aria-live="polite">
                        Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({filteredContributions.length} items)
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contributions;
