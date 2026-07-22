import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Contribution } from '../types/index';
import { generateThankYouNote } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import ContributionsNavigation from '../components/ContributionsNavigation';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';
import { ThankYouModal } from '../components/ThankYouModal';
import ImageViewerModal from '../components/ImageViewerModal';
import { ContributionsTable } from '../components/ContributionsTable';
import { PaginationControls } from '../components/PaginationControls';

const Contributions: React.FC = () => {
    const { token } = useAuth();
    const { contributions, campaigns } = useData();
    const { openContributionModal, openConfirmationModal, openHistoryModal } = useModal();
    
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'miscellaneous' ? 'miscellaneous' : 'individual';

    const setActiveTab = (tab: 'individual' | 'miscellaneous') => {
        setSearchParams({ tab });
    };
    
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
            .filter(d => {
                if (activeTab === 'individual') {
                    return d.type !== 'Miscellaneous' && !d.type?.startsWith('Miscellaneous:') && d.type !== 'Stall Fee' && !d.stallRegistrationId;
                } else {
                    return d.type === 'Miscellaneous' || d.type?.startsWith('Miscellaneous:');
                }
            })
            .filter(d => searchTerm === '' || d.donorName.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(d => filterCampaign === 'all' || (d.campaignId !== null && d.campaignId.toString() === filterCampaign));
    }, [contributions, searchTerm, filterCampaign, activeTab]);

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
                {/* Tab selector */}
                <div className="flex border-b border-slate-200 mb-6">
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                            activeTab === 'individual'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Individual Contributions
                    </button>
                    <button
                        onClick={() => setActiveTab('miscellaneous')}
                        className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                            activeTab === 'miscellaneous'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Miscellaneous Contributions
                    </button>
                </div>

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
                        placeholder={activeTab === 'miscellaneous' ? "Search by name or source..." : "Search by donor name..."}
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
                    {activeTab === 'miscellaneous' && (
                        <button
                            onClick={() => openContributionModal({ type: 'Miscellaneous' } as any)}
                            className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition"
                        >
                            <span className="mr-2">+</span> Add Miscellaneous Contribution
                        </button>
                    )}
                </div>

                <ContributionsTable
                    activeTab={activeTab}
                    paginatedContributions={paginatedContributions}
                    campaignMap={campaignMap}
                    onGenerateNote={handleGenerateNote}
                    onViewHistory={(contribution) => openHistoryModal('contributions', contribution.id, `History for ${contribution.donorName}'s contribution`)}
                    onEdit={(contribution) => openContributionModal(contribution)}
                    onDelete={(id) => openConfirmationModal(id, 'contributions')}
                    onViewImage={(url) => setViewingImage(url)}
                    totalContributionsCount={contributions.length}
                />

                <PaginationControls
                    rowsPerPage={rowsPerPage}
                    setRowsPerPage={setRowsPerPage}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredContributions.length}
                    onPreviousPage={handlePreviousPage}
                    onNextPage={handleNextPage}
                />
            </div>
        </div>
    );
};

export default Contributions;
