import { useCallback } from 'react';
import type { 
    Contribution, Campaign, Sponsor, Vendor, Expense, Quotation, 
    Budget as BudgetType, Festival, Task, Event 
} from '../../types/index';
import { ContributionStatus } from '../../types/index';
import { API_URL } from '../../config';

interface UseDataHandlersParams {
    token: string | null;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    fetchData: () => Promise<void>;
    contributions: Contribution[];
    sponsors: Sponsor[];
    expenses: Expense[];
    festivals: Festival[];
    setContributions: React.Dispatch<React.SetStateAction<Contribution[]>>;
    setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
    setSponsors: React.Dispatch<React.SetStateAction<Sponsor[]>>;
    setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
    setBudgets: React.Dispatch<React.SetStateAction<BudgetType[]>>;
    setFestivals: React.Dispatch<React.SetStateAction<Festival[]>>;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setEventDataVersion: React.Dispatch<React.SetStateAction<number>>;
}

export function useDataHandlers({
    token,
    logout,
    hasPermission,
    fetchData,
    contributions,
    sponsors,
    expenses,
    festivals,
    setContributions,
    setCampaigns,
    setSponsors,
    setVendors,
    setExpenses,
    setQuotations,
    setBudgets,
    setFestivals,
    setTasks,
    setEventDataVersion,
}: UseDataHandlersParams) {

    const getAuthHeaders = useCallback(() => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    const handleAdd = useCallback(async <T extends { id: any }, C>(url: string, body: C, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
        try {
            const response = await fetch(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to add item`);
            }
            const newItem: T = await response.json();
            setData((prev: T[]) => [newItem, ...prev]);
        } catch (error) {
            console.error(`Failed to add item:`, error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        }
    }, [getAuthHeaders, logout]);

    const handleUpdate = useCallback(async <T extends { id: number }>(url: string, body: T, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
        try {
            const response = await fetch(`${url}/${body.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) });
            if (response.status === 401) { logout(); return; }
            const updatedItem: T = await response.json();
            setData((prev: T[]) => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        } catch (error) {
            console.error(`Failed to update item:`, error);
        }
    }, [getAuthHeaders, logout]);

    const handleDeleteClick = useCallback((_id: number, _type: string) => {
        if (!hasPermission('action:delete')) {
            alert("You don't have permission to archive items.");
            return;
        }
    }, [hasPermission]);

    const handleRestore = useCallback(async (recordType: string, recordId: number) => {
        if (!hasPermission('action:restore')) {
            alert("You don't have permission to restore items.");
            return;
        }
        try {
            const response = await fetch(`${API_URL}/${recordType}/${recordId}/restore`, {
                method: 'POST', headers: getAuthHeaders()
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to restore item`);
            }
            await fetchData();
        } catch (error) {
            console.error('Failed to restore item:', error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        }
    }, [hasPermission, getAuthHeaders, logout, fetchData]);

    const handleContributionSubmit = useCallback((data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Contribution | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/contributions`, { ...itemToEdit, ...data }, setContributions);
        else handleAdd(`${API_URL}/contributions`, data, setContributions);
    }, [handleUpdate, handleAdd, setContributions]);

    const handleApproveContribution = useCallback(async (id: number) => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_URL}/contributions/${id}/approve`, {
                method: 'PUT',
                headers,
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to approve contribution');
            }
            await fetchData();
        } catch (error) {
            console.error('Approve contribution error:', error);
            alert(error instanceof Error ? error.message : 'Failed to approve contribution');
        }
    }, [getAuthHeaders, logout, fetchData]);

    const handleRejectContribution = useCallback(async (id: number) => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_URL}/contributions/${id}/reject`, {
                method: 'PUT',
                headers,
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to reject contribution');
            }
            await fetchData();
        } catch (error) {
            console.error('Reject contribution error:', error);
            alert(error instanceof Error ? error.message : 'Failed to reject contribution');
        }
    }, [getAuthHeaders, logout, fetchData]);

    const handleSponsorSubmit = useCallback((data: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Sponsor | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/sponsors`, { ...itemToEdit, ...data }, setSponsors);
        else handleAdd(`${API_URL}/sponsors`, data, setSponsors);
    }, [handleUpdate, handleAdd, setSponsors]);

    const handleVendorSubmit = useCallback((data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Vendor | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/vendors`, { ...itemToEdit, ...data }, setVendors);
        else handleAdd(`${API_URL}/vendors`, data, setVendors);
    }, [handleUpdate, handleAdd, setVendors]);

    const handleExpenseSubmit = useCallback((data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'amountPaid' | 'outstandingAmount'>, itemToEdit: Expense | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/expenses`, { ...itemToEdit, ...data }, setExpenses);
        else handleAdd(`${API_URL}/expenses`, data, setExpenses);
    }, [handleUpdate, handleAdd, setExpenses]);

    const handleQuotationSubmit = useCallback((data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Quotation | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/quotations`, { ...itemToEdit, ...data }, setQuotations);
        else handleAdd(`${API_URL}/quotations`, data, setQuotations);
    }, [handleUpdate, handleAdd, setQuotations]);

    const handleBudgetSubmit = useCallback((data: Omit<BudgetType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: BudgetType | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/budgets`, { ...itemToEdit, ...data }, setBudgets);
        else handleAdd(`${API_URL}/budgets`, data, setBudgets);
    }, [handleUpdate, handleAdd, setBudgets]);

    const handleFestivalSubmit = useCallback((data: Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Festival | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/festivals`, { ...itemToEdit, ...data }, setFestivals);
        else handleAdd(`${API_URL}/festivals`, data, setFestivals);
    }, [handleUpdate, handleAdd, setFestivals]);

    const handleTaskSubmit = useCallback((data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Task | null) => {
        if (itemToEdit && itemToEdit.id) handleUpdate(`${API_URL}/tasks`, { ...itemToEdit, ...data }, setTasks);
        else handleAdd(`${API_URL}/tasks`, data, setTasks);
    }, [handleUpdate, handleAdd, setTasks]);

    const handleCampaignSubmit = useCallback(async (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { sourceCampaignId?: number }, itemToEdit: Campaign | null) => {
        if (itemToEdit && itemToEdit.id) {
            handleUpdate(`${API_URL}/campaigns`, { ...itemToEdit, ...data }, setCampaigns);
        } else {
            const { sourceCampaignId, ...campaignData } = data;
            
            try {
                const response = await fetch(`${API_URL}/campaigns`, { 
                    method: 'POST', 
                    headers: getAuthHeaders(), 
                    body: JSON.stringify(campaignData) 
                });
                
                if (response.status === 401) { logout(); return; }
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to add campaign`);
                }
                
                const newCampaign: Campaign = await response.json();
                setCampaigns((prev) => [newCampaign, ...prev]);

                if (typeof sourceCampaignId === 'number') {
                    const sourceContributions = contributions.filter(c => c.campaignId === sourceCampaignId);
                    const sourceSponsors = sponsors.filter(s => s.campaignId === sourceCampaignId);
                    const campaignFestivalIds = festivals.filter(f => f.campaignId === sourceCampaignId).map(f => f.id);
                    const sourceExpenses = expenses.filter(e => e.festivalId && campaignFestivalIds.includes(e.festivalId));

                    const totalRaised = sourceContributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0) +
                                       sourceSponsors.reduce((acc, s) => acc + (Number(s.sponsorshipAmount) || 0), 0);
                    
                    const totalExpenses = sourceExpenses.reduce((acc, e) => acc + (Number(e.totalCost) || 0), 0);
                    
                    const balance = totalRaised - totalExpenses;

                    const broughtForwardContribution = {
                        donorName: "Balance Brought Forward",
                        towerNumber: "N/A",
                        flatNumber: "N/A",
                        amount: balance,
                        numberOfCoupons: 0,
                        campaignId: newCampaign.id,
                        date: new Date().toISOString(),
                        status: ContributionStatus.Completed,
                        type: 'Online' as any,
                        donorEmail: '',
                        mobileNumber: ''
                    };

                    await handleAdd(`${API_URL}/contributions`, broughtForwardContribution, setContributions);
                }
            } catch (error) {
                console.error(`Failed to process campaign submission:`, error);
                alert(error instanceof Error ? error.message : "An unknown error occurred.");
            }
        }
    }, [handleUpdate, getAuthHeaders, logout, setCampaigns, contributions, sponsors, festivals, expenses, handleAdd, setContributions]);

    const handleEventSubmit = useCallback(async (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Event | null) => {
        const url = itemToEdit ? `${API_URL}/events/${itemToEdit.id}` : `${API_URL}/events`;
        const method = itemToEdit ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(data) });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error('Failed to save event');
            setEventDataVersion(v => v + 1);
        } catch (error) {
            console.error('Failed to save event:', error);
            alert('Failed to save event.');
        }
    }, [getAuthHeaders, logout, setEventDataVersion]);

    return {
        handleDeleteClick,
        handleRestore,
        handleContributionSubmit,
        handleApproveContribution,
        handleRejectContribution,
        handleSponsorSubmit,
        handleVendorSubmit,
        handleExpenseSubmit,
        handleQuotationSubmit,
        handleBudgetSubmit,
        handleFestivalSubmit,
        handleTaskSubmit,
        handleCampaignSubmit,
        handleEventSubmit,
    };
}
