import { useState, useCallback } from 'react';
import type { Contribution, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType, Festival, Task, Event, Campaign } from '../../types/index';

interface UseEntityModalsProps {
    hasPermission: (permission: string) => boolean;
}

export function useEntityModals({ hasPermission }: UseEntityModalsProps) {
    // Visibility state
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

    // Edit item state
    const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
    const [sponsorToEdit, setSponsorToEdit] = useState<Sponsor | null>(null);
    const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null);
    const [budgetToEdit, setBudgetToEdit] = useState<BudgetType | null>(null);
    const [festivalToEdit, setFestivalToEdit] = useState<Festival | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

    // Generic modal opener with permission check
    const openModal = useCallback(<T,>(
        setter: React.Dispatch<React.SetStateAction<boolean>>,
        itemToEditSetter: (item: T | null) => void,
        item?: T
    ) => {
        const requiredPermission = (item && (item as any).id) ? 'action:edit' : 'action:create';
        if (!hasPermission(requiredPermission)) {
            alert(`You do not have permission to ${(item && (item as any).id) ? 'edit' : 'create'} this item.`);
            return;
        }
        itemToEditSetter(item || null);
        setter(true);
    }, [hasPermission]);

    const openContributionModal = (item?: Contribution) => openModal(setIsContributionModalOpen, setContributionToEdit, item);
    const closeContributionModal = () => { setIsContributionModalOpen(false); setContributionToEdit(null); };

    const openSponsorModal = (item?: Sponsor) => openModal(setIsSponsorModalOpen, setSponsorToEdit, item);
    const closeSponsorModal = () => { setIsSponsorModalOpen(false); setSponsorToEdit(null); };

    const openVendorModal = (item?: Vendor) => openModal(setIsVendorModalOpen, setVendorToEdit, item);
    const closeVendorModal = () => { setIsVendorModalOpen(false); setVendorToEdit(null); };

    const openExpenseModal = (item?: Expense) => openModal(setIsExpenseModalOpen, setExpenseToEdit, item);
    const closeExpenseModal = () => { setIsExpenseModalOpen(false); setExpenseToEdit(null); };

    const openQuotationModal = (item?: Quotation) => openModal(setIsQuotationModalOpen, setQuotationToEdit, item);
    const closeQuotationModal = () => { setIsQuotationModalOpen(false); setQuotationToEdit(null); };

    const openBudgetModal = (item?: BudgetType) => openModal(setIsBudgetModalOpen, setBudgetToEdit, item);
    const closeBudgetModal = () => { setIsBudgetModalOpen(false); setBudgetToEdit(null); };

    const openFestivalModal = (item?: Festival) => openModal(setIsFestivalModalOpen, setFestivalToEdit, item);
    const closeFestivalModal = () => { setIsFestivalModalOpen(false); setFestivalToEdit(null); };

    const openTaskModal = (item?: Task) => openModal(setIsTaskModalOpen, setTaskToEdit, item);
    const closeTaskModal = () => { setIsTaskModalOpen(false); setTaskToEdit(null); };

    const openEventModal = (item?: Event) => openModal(setIsEventModalOpen, setEventToEdit, item);
    const closeEventModal = () => { setIsEventModalOpen(false); setEventToEdit(null); };

    const openCampaignModal = (item?: Campaign) => openModal(setIsCampaignModalOpen, setCampaignToEdit, item);
    const closeCampaignModal = () => { setIsCampaignModalOpen(false); setCampaignToEdit(null); };

    return {
        isContributionModalOpen, contributionToEdit, openContributionModal, closeContributionModal,
        isSponsorModalOpen, sponsorToEdit, openSponsorModal, closeSponsorModal,
        isVendorModalOpen, vendorToEdit, openVendorModal, closeVendorModal,
        isExpenseModalOpen, expenseToEdit, openExpenseModal, closeExpenseModal,
        isQuotationModalOpen, quotationToEdit, openQuotationModal, closeQuotationModal,
        isBudgetModalOpen, budgetToEdit, openBudgetModal, closeBudgetModal,
        isFestivalModalOpen, festivalToEdit, openFestivalModal, closeFestivalModal,
        isTaskModalOpen, taskToEdit, openTaskModal, closeTaskModal,
        isEventModalOpen, eventToEdit, openEventModal, closeEventModal,
        isCampaignModalOpen, campaignToEdit, openCampaignModal, closeCampaignModal,
    };
}
