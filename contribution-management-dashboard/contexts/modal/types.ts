import type { Contribution, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType, Festival, Task, Event, HistoryItem, Campaign } from '../../types/index';

export interface ModalContextType {
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
    
    isCampaignModalOpen: boolean;
    campaignToEdit: Campaign | null;
    openCampaignModal: (item?: Campaign) => void;
    closeCampaignModal: () => void;

    isConfirmationModalOpen: boolean;
    confirmMessage: string;
    confirmText: string;
    openConfirmationModal: (id: number, type: string, onDeleteSuccess?: () => void) => void;
    closeConfirmationModal: () => void;
    confirmDelete: () => Promise<void>;

    isHistoryModalOpen: boolean;
    historyData: HistoryItem[];
    historyTitle: string;
    isLoadingHistory: boolean;
    openHistoryModal: (recordType: string, recordId: number, title: string) => void;
    closeHistoryModal: () => void;
}
