import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Contribution } from '../types/index';
import { ContributionStatus } from '../types/index';
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
import { PendingContributionsTable } from '../components/PendingContributionsTable';
import { Clock, AlertTriangle } from 'lucide-react';

const Contributions: React.FC = () => {
    const { token, hasPermission } = useAuth();
    const { contributions, campaigns, handleApproveContribution, handleRejectContribution } = useData();
    const { openContributionModal, openConfirmationModal, openHistoryModal } = useModal();
    
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam === 'miscellaneous' ? 'miscellaneous' : tabParam === 'pending' ? 'pending' : 'individual';

    const isManager = hasPermission('action:edit') || hasPermission('action:users:manage');

    const setActiveTab = (tab: 'individual' | 'miscellaneous' | 'pending') => {
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

    const pendingContributions = useMemo(() => {
        return contributions.filter(c => c.status === ContributionStatus.Pending);
    }, [contributions]);

    const approvedContributions = useMemo(() => {
        return contributions.filter(c => c.status === ContributionStatus.Completed || c.status === ContributionStatus.Approved);
    }, [contributions]);

    const filteredContributions = useMemo(() => {
        return approvedContributions
            .filter(d => {
                if (activeTab === 'individual') {
                    return d.type !== 'Miscellaneous' && !d.type?.startsWith('Miscellaneous:') && d.type !== 'Stall Fee' && !d.stallRegistrationId;
                } else {
                    return d.type === 'Miscellaneous' || d.type?.startsWith('Miscellaneous:');
                }
            })
            .filter(d => searchTerm === '' || d.donorName.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(d => filterCampaign === 'all' || (d.campaignId !== null && d.campaignId.toString() === filterCampaign));
    }, [approvedContributions, searchTerm, filterCampaign, activeTab]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCampaign, rowsPerPage, activeTab]);

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

            {/* Manager Alert Banner for Pending Approvals */}
            {isManager && pendingContributions.length > 0 && activeTab !== 'pending' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-900 text-sm">
                                {pendingContributions.length} Contribution{pendingContributions.length > 1 ? 's' : ''} Awaiting Review
                            </h4>
                            <p className="text-xs text-amber-700">
                                Donor entries submitted require Manager confirmation before being added to official contributions.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
                    >
                        <Clock className="w-4 h-4" /> Review Pending Entries ({pendingContributions.length})
                    </button>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-md">
                {/* Tab selector */}
                <div className="flex border-b border-slate-200 mb-6 gap-2">
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

                    {isManager && (
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-all duration-200 flex items-center gap-2 ${
                                activeTab === 'pending'
                                    ? 'border-amber-500 text-amber-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span>Pending Review</span>
                            {pendingContributions.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {pendingContributions.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {isLoadingNote && (
                    <div className="fixed inset-0 bg-white bg-opacity-75 flex flex-col justify-center items-center z-50">
                        <SparklesIcon className="w-12 h-12 text-blue-500 animate-pulse" />
                        <p className="mt-4 text-lg text-slate-700">Generating personal note...</p>
                    </div>
                )}
                {generatedNote && <ThankYouModal note={generatedNote} onClose={() => setGeneratedNote(null)} />}
                {viewingImage && <ImageViewerModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}

                {activeTab === 'pending' ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">Pending Contribution Approvals</h3>
                                <p className="text-xs text-slate-500">Review transactions submitted by Donors. Approving an entry confirms it and moves it into the official contribution table.</p>
                            </div>
                        </div>

                        <PendingContributionsTable
                            pendingContributions={pendingContributions}
                            campaignMap={campaignMap}
                            onApprove={handleApproveContribution}
                            onReject={handleRejectContribution}
                            onViewImage={(url) => setViewingImage(url)}
                        />
                    </div>
                ) : (
                    <>
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
                            totalContributionsCount={approvedContributions.length}
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
                    </>
                )}
            </div>
        </div>
    );
};

export default Contributions;
