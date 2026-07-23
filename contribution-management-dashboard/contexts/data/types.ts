import type { Contribution, Campaign, Donor, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType, Festival, Task, UserForManagement, Event, StallRegistration } from '../../types/index';

export interface DataContextType {
    contributions: Contribution[];
    campaigns: Campaign[];
    sponsors: Sponsor[];
    vendors: Vendor[];
    expenses: Expense[];
    quotations: Quotation[];
    budgets: BudgetType[];
    festivals: Festival[];
    tasks: Task[];
    users: UserForManagement[];
    donors: Donor[];
    stallRegistrations: StallRegistration[];
    expenseHeads: string[];
    festivalMap: Map<number, string>;
    fetchData: () => Promise<void>;
    handleContributionSubmit: (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Contribution | null) => void;
    handleApproveContribution: (id: number) => Promise<void>;
    handleRejectContribution: (id: number) => Promise<void>;
    handleSponsorSubmit: (data: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Sponsor | null) => void;
    handleVendorSubmit: (data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Vendor | null) => void;
    handleExpenseSubmit: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'amountPaid' | 'outstandingAmount'>, itemToEdit: Expense | null) => void;
    handleQuotationSubmit: (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Quotation | null) => void;
    handleBudgetSubmit: (data: Omit<BudgetType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: BudgetType | null) => void;
    handleFestivalSubmit: (data: Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Festival | null) => void;
    handleTaskSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Task | null) => void;
    handleEventSubmit: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Event | null) => Promise<void>;
    handleCampaignSubmit: (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { sourceCampaignId?: number }, itemToEdit: Campaign | null) => void;
    handleDeleteClick: (id: number, type: string) => void;
    handleRestore: (recordType: string, recordId: number) => Promise<void>;
    eventDataVersion: number;
    triggerEventRefetch: () => void;
    selectedCampaignId: string;
    setSelectedCampaignId: (id: string) => void;
}
