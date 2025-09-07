import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import type { Contribution, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType, Festival, Task, Event, HistoryItem } from '../types';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { API_URL } from '../config';

interface ModalContextType {
    isContributionModalOpen: boolean;
    contributionToEdit: Contribution | null;
    openContributionModal: (item?: Contribution) => void;
    closeContributionModal: () => void;

    isSponsorModalOpen: boolean;
    sponsorToEdit: Sponsor | null;
    openSponsorModal: (item?: Sponsor) => void;
    closeSponsorModal: () => void;

    isVendorModalOpen: boolean;
    vendorToEdit: Vendor | null;
    openVendorModal: (item?: Vendor) => void;
    closeVendorModal: () => void;

    isExpenseModalOpen: boolean;
    expenseToEdit: Expense | null;
    openExpenseModal: (item?: Expense) => void;
    closeExpenseModal: () => void;

    isQuotationModalOpen: boolean;
    quotationToEdit: Quotation | null;
    openQuotationModal: (item?: Quotation) => void;
    closeQuotationModal: () => void;

    isBudgetModalOpen: boolean;
    budgetToEdit: BudgetType | null;
    openBudgetModal: (item?: BudgetType) => void;
    closeBudgetModal: () => void;

    isFestivalModalOpen: boolean;
    festivalToEdit: Festival | null;
    openFestivalModal: (item?: Festival) => void;
    closeFestivalModal: () => void;

    isTaskModalOpen: boolean;
    taskToEdit: Task | null;
    openTaskModal: (item?: Task) => void;
    closeTaskModal: () => void;

    isEventModalOpen: boolean;
    eventToEdit: Event | null;
    openEventModal: (item?: Event) => void;
    closeEventModal: () => void;

    isConfirmationModalOpen: boolean;
    confirmMessage: string;
    openConfirmationModal: (id: number, type: string) => void;
    closeConfirmationModal: () => void;
    confirmDelete: () => Promise<void>;

    isHistoryModalOpen: boolean;
    historyData: HistoryItem[];
    historyTitle: string;
    isLoadingHistory: boolean;
    openHistoryModal: (recordType: string, recordId: number, title: string) => void;
    closeHistoryModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { hasPermission, token, logout } = useAuth();
    const { fetchData } = useData();

    // Modal visibility state
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    // State for editing items
    const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
    const [sponsorToEdit, setSponsorToEdit] = useState<Sponsor | null>(null);
    const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null);
    const [budgetToEdit, setBudgetToEdit] = useState<BudgetType | null>(null);
    const [festivalToEdit, setFestivalToEdit] = useState<Festival | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

    // State for deletion confirmation
    const [itemToDelete, setItemToDelete] = useState<{ id: number; type: string } | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    // FIX: Import and use `useMemo` to prevent recalculating the message on every render.
    const confirmMessage = useMemo(() => {
        if (!itemToDelete) return '';
        const itemType = itemToDelete.type.slice(0, -1);
        return `Are you sure you want to archive this ${itemType}? It can be restored later from the Archive page.`;
    }, [itemToDelete]);

    // State for History Modal
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [historyTitle, setHistoryTitle] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    // Generic modal opener with permission check
    const openModal = <T,>(setter: React.Dispatch<React.SetStateAction<boolean>>, itemToEditSetter: (item: T | null) => void, item?: T) => {
        const requiredPermission = item ? 'action:edit' : 'action:create';
        if (!hasPermission(requiredPermission)) {
            alert(`You do not have permission to ${item ? 'edit' : 'create'} this item.`);
            return;
        }
        itemToEditSetter(item || null);
        setter(true);
    };

    // --- Modal Control Functions ---
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

    // --- Confirmation and History Modals ---
    const openConfirmationModal = (id: number, type: string) => {
        if (!hasPermission('action:delete')) {
            alert("You don't have permission to archive items.");
            return;
        }
        setItemToDelete({ id, type });
        setIsConfirmationModalOpen(true);
    };
    const closeConfirmationModal = () => setIsConfirmationModalOpen(false);

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        try {
            const response = await fetch(`${API_URL}/${type}/${id}`, { 
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) { 
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to archive ${type}`);
            }
            await fetchData();
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsConfirmationModalOpen(false);
            setItemToDelete(null);
        }
    };

    const openHistoryModal = async (recordType: string, recordId: number, title: string) => {
        if (!token) return;
        setHistoryTitle(title);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        setHistoryData([]);

        try {
            const response = await fetch(`${API_URL}/${recordType}/${recordId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error(`Failed to fetch history for ${recordType}`);
            const data: HistoryItem[] = await response.json();
            setHistoryData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingHistory(false);
        }
    };
    const closeHistoryModal = () => setIsHistoryModalOpen(false);

    const value = {
        isContributionModalOpen, contributionToEdit, openContributionModal, closeContributionModal,
        isSponsorModalOpen, sponsorToEdit, openSponsorModal, closeSponsorModal,
        isVendorModalOpen, vendorToEdit, openVendorModal, closeVendorModal,
        isExpenseModalOpen, expenseToEdit, openExpenseModal, closeExpenseModal,
        isQuotationModalOpen, quotationToEdit, openQuotationModal, closeQuotationModal,
        isBudgetModalOpen, budgetToEdit, openBudgetModal, closeBudgetModal,
        isFestivalModalOpen, festivalToEdit, openFestivalModal, closeFestivalModal,
        isTaskModalOpen, taskToEdit, openTaskModal, closeTaskModal,
        isEventModalOpen, eventToEdit, openEventModal, closeEventModal,
        isConfirmationModalOpen, confirmMessage, openConfirmationModal, closeConfirmationModal, confirmDelete,
        isHistoryModalOpen, historyData, historyTitle, isLoadingHistory, openHistoryModal, closeHistoryModal,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
