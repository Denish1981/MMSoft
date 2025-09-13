import React, { useState, useEffect } from 'react';
// FIX: Split imports between react-router and react-router-dom to fix export resolution issues.
import { Outlet, useLocation, Navigate } from 'react-router';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useModal } from '../contexts/ModalContext';
import { useData } from '../contexts/DataContext';

import { ContributionModal } from '../components/DonationModal';
import { SponsorModal } from '../components/SponsorModal';
import { VendorModal } from '../components/VendorModal';
import { ExpenseModal } from '../components/ExpenseModal';
import { QuotationModal } from '../components/QuotationModal';
import { BudgetModal } from '../components/BudgetModal';
import { FestivalModal } from '../components/FestivalModal';
import { TaskModal } from '../components/TaskModal';
import { EventModal } from '../components/EventModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { HistoryModal } from '../components/HistoryModal';
import { useAuth } from '../contexts/AuthContext';
import { CampaignModal } from '../components/CampaignModal';

export const ProtectedLayout: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const {
        isContributionModalOpen, contributionToEdit, closeContributionModal,
        isSponsorModalOpen, sponsorToEdit, closeSponsorModal,
        isVendorModalOpen, vendorToEdit, closeVendorModal,
        isExpenseModalOpen, expenseToEdit, closeExpenseModal,
        isQuotationModalOpen, quotationToEdit, closeQuotationModal,
        isBudgetModalOpen, budgetToEdit, closeBudgetModal,
        isFestivalModalOpen, festivalToEdit, closeFestivalModal,
        isTaskModalOpen, taskToEdit, closeTaskModal,
        isEventModalOpen, eventToEdit, closeEventModal,
        isCampaignModalOpen, campaignToEdit, closeCampaignModal,
        isConfirmationModalOpen, confirmMessage, closeConfirmationModal, confirmDelete,
        isHistoryModalOpen, historyData, historyTitle, isLoadingHistory, closeHistoryModal,
    } = useModal();
    
    const {
        campaigns, vendors, festivals, expenseHeads, users, festivalMap,
        handleContributionSubmit, handleSponsorSubmit, handleVendorSubmit, handleExpenseSubmit,
        handleQuotationSubmit, handleBudgetSubmit, handleFestivalSubmit, handleTaskSubmit, handleEventSubmit,
        handleCampaignSubmit, eventDataVersion
    } = useData();
    
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) { // Tailwind's 'md' breakpoint
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div className="flex h-screen bg-slate-100">
            <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                ></div>
            )}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                <Header onMobileMenuClick={() => setIsMobileMenuOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
                    <Outlet context={{ eventDataVersion }} />
                </main>
            </div>
            {isContributionModalOpen && <ContributionModal campaigns={campaigns} contributionToEdit={contributionToEdit} onClose={closeContributionModal} onSubmit={(data) => { handleContributionSubmit(data, contributionToEdit); closeContributionModal(); }} />}
            {isSponsorModalOpen && <SponsorModal sponsorToEdit={sponsorToEdit} onClose={closeSponsorModal} onSubmit={(data) => { handleSponsorSubmit(data, sponsorToEdit); closeSponsorModal(); }} />}
            {isVendorModalOpen && <VendorModal vendorToEdit={vendorToEdit} onClose={closeVendorModal} onSubmit={(data) => { handleVendorSubmit(data, vendorToEdit); closeVendorModal(); }} />}
            {isExpenseModalOpen && <ExpenseModal vendors={vendors} festivals={festivals} expenseToEdit={expenseToEdit} onClose={closeExpenseModal} onSubmit={(data) => { handleExpenseSubmit(data, expenseToEdit); closeExpenseModal(); }} />}
            {isQuotationModalOpen && <QuotationModal vendors={vendors} festivals={festivals} quotationToEdit={quotationToEdit} onClose={closeQuotationModal} onSubmit={(data) => { handleQuotationSubmit(data, quotationToEdit); closeQuotationModal(); }} />}
            {isBudgetModalOpen && <BudgetModal expenseHeads={expenseHeads} festivals={festivals} budgetToEdit={budgetToEdit} onClose={closeBudgetModal} onSubmit={(data) => { handleBudgetSubmit(data, budgetToEdit); closeBudgetModal(); }} />}
            {isFestivalModalOpen && <FestivalModal campaigns={campaigns} festivalToEdit={festivalToEdit} onClose={closeFestivalModal} onSubmit={(data) => { handleFestivalSubmit(data, festivalToEdit); closeFestivalModal(); }} />}
            {isTaskModalOpen && <TaskModal users={users} festivals={festivals} taskToEdit={taskToEdit} onClose={closeTaskModal} onSubmit={(data) => { handleTaskSubmit(data, taskToEdit); closeTaskModal(); }} />}
            {isEventModalOpen && <EventModal eventToEdit={eventToEdit} onClose={closeEventModal} onSubmit={async (data) => { await handleEventSubmit(data, eventToEdit); closeEventModal(); }} />}
            {isCampaignModalOpen && <CampaignModal campaignToEdit={campaignToEdit} onClose={closeCampaignModal} onSubmit={(data) => { handleCampaignSubmit(data, campaignToEdit); closeCampaignModal(); }} />}
            {isConfirmationModalOpen && <ConfirmationModal onConfirm={confirmDelete} onCancel={closeConfirmationModal} message={confirmMessage} confirmText="Yes, Archive" />}
            {isHistoryModalOpen && <HistoryModal isOpen={isHistoryModalOpen} onClose={closeHistoryModal} title={historyTitle} history={historyData} isLoading={isLoadingHistory} festivalMap={festivalMap} />}
        </div>
    );
};