import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { Contribution, Campaign, Donor, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType, Festival, Task, UserForManagement, HistoryItem, Event } from '../types';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';

interface DataContextType {
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
    expenseHeads: string[];
    festivalMap: Map<number, string>;
    fetchData: () => Promise<void>;
    handleContributionSubmit: (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Contribution | null) => void;
    handleSponsorSubmit: (data: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Sponsor | null) => void;
    handleVendorSubmit: (data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Vendor | null) => void;
    handleExpenseSubmit: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'amountPaid' | 'outstandingAmount'>, itemToEdit: Expense | null) => void;
    handleQuotationSubmit: (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Quotation | null) => void;
    handleBudgetSubmit: (data: Omit<BudgetType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: BudgetType | null) => void;
    handleFestivalSubmit: (data: Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Festival | null) => void;
    handleTaskSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Task | null) => void;
    handleEventSubmit: (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Event | null) => Promise<void>;
    handleCampaignSubmit: (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Campaign | null) => void;
    handleDeleteClick: (id: number, type: string) => void;
    handleRestore: (recordType: string, recordId: number) => Promise<void>;
    eventDataVersion: number;
    triggerEventRefetch: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, token, logout, hasPermission } = useAuth();
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [budgets, setBudgets] = useState<BudgetType[]>([]);
    const [festivals, setFestivals] = useState<Festival[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserForManagement[]>([]);
    const [eventDataVersion, setEventDataVersion] = useState(0);

    const getAuthHeaders = useCallback(() => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    const fetchData = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const resPromises = [
                fetch(`${API_URL}/contributions`, { headers }), fetch(`${API_URL}/campaigns`, { headers }),
                fetch(`${API_URL}/sponsors`, { headers }), fetch(`${API_URL}/vendors`, { headers }),
                fetch(`${API_URL}/expenses`, { headers }), fetch(`${API_URL}/quotations`, { headers }),
                fetch(`${API_URL}/budgets`, { headers }), fetch(`${API_URL}/festivals`, { headers }),
                fetch(`${API_URL}/tasks`, { headers }), fetch(`${API_URL}/users/management`, { headers })
            ];
            const responses = await Promise.all(resPromises);
            
            if (responses.some(res => res.status === 401)) {
                logout();
                return;
            }

            const data = await Promise.all(responses.map(res => res.ok ? res.json() : Promise.resolve(null)));
            
            setContributions(data[0] || []);
            setCampaigns(data[1] || []);
            setSponsors(data[2] || []);
            setVendors(data[3] || []);
            setExpenses(data[4] || []);
            setQuotations(data[5] || []);
            setBudgets(data[6] || []);
            setFestivals(data[7] || []);
            setTasks(data[8] || []);
            setUsers(data[9] || []); // If fetch fails (e.g., no permission), it will be null, defaulting to empty array.

        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    }, [isAuthenticated, token, logout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const donors = useMemo((): Donor[] => {
        const donorMap = new Map<string, Donor>();
        [...contributions].reverse().forEach(contribution => {
            if (!contribution || !contribution.donorName || !contribution.towerNumber || !contribution.flatNumber) return;
            const donorId = `${contribution.donorName.toLowerCase().replace(/\s/g, '-')}-${contribution.towerNumber}-${contribution.flatNumber}`;
            let donor = donorMap.get(donorId);
            if (!donor) {
                donor = {
                    id: donorId, name: contribution.donorName, towerNumber: contribution.towerNumber,
                    flatNumber: contribution.flatNumber, totalContributed: 0, contributionCount: 0,
                    email: contribution.donorEmail, mobileNumber: contribution.mobileNumber,
                };
            } else {
                if (contribution.donorEmail) donor.email = contribution.donorEmail;
                if (contribution.mobileNumber) donor.mobileNumber = contribution.mobileNumber;
            }
            donor.totalContributed += (Number(contribution.amount) || 0);
            donor.contributionCount += 1;
            donorMap.set(donorId, donor);
        });
        return Array.from(donorMap.values()).sort((a,b) => b.totalContributed - a.totalContributed);
    }, [contributions]);

    const expenseHeads = useMemo(() => Array.from(new Set(expenses.map(e => e.expenseHead))), [expenses]);
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    // --- Generic CRUD Handlers ---
    const handleAdd = async <T extends { id: any }>(url: string, body: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
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
    };

    const handleUpdate = async <T extends {id: number}>(url: string, body: T, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
        try {
            const response = await fetch(`${url}/${body.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) });
            if (response.status === 401) { logout(); return; }
            const updatedItem: T = await response.json();
            setData((prev: T[]) => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        } catch (error) {
            console.error(`Failed to update item:`, error);
        }
    };

    const handleDeleteClick = (id: number, type: string) => {
        // This will be handled by ModalContext, but keeping the permission check here
        if (!hasPermission('action:delete')) {
            alert("You don't have permission to archive items.");
            return;
        }
        // The modal context will call its own `setItemToDelete` and open the confirmation modal.
    };

    const handleRestore = async (recordType: string, recordId: number) => {
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
    };

    // --- Specific Submit Handlers ---
    const handleContributionSubmit = (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Contribution | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Contribution` type.
        if (itemToEdit) handleUpdate(`${API_URL}/contributions`, { ...itemToEdit, ...data }, setContributions);
        else handleAdd(`${API_URL}/contributions`, data, setContributions);
    };
    const handleSponsorSubmit = (data: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Sponsor | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Sponsor` type.
        if (itemToEdit) handleUpdate(`${API_URL}/sponsors`, { ...itemToEdit, ...data }, setSponsors);
        else handleAdd(`${API_URL}/sponsors`, data, setSponsors);
    };
    const handleVendorSubmit = (data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Vendor | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Vendor` type.
        if (itemToEdit) handleUpdate(`${API_URL}/vendors`, { ...itemToEdit, ...data }, setVendors);
        else handleAdd(`${API_URL}/vendors`, data, setVendors);
    };
    const handleExpenseSubmit = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'amountPaid' | 'outstandingAmount'>, itemToEdit: Expense | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Expense` type.
        if (itemToEdit) handleUpdate(`${API_URL}/expenses`, { ...itemToEdit, ...data }, setExpenses);
        else handleAdd(`${API_URL}/expenses`, data, setExpenses);
    };
    const handleQuotationSubmit = (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Quotation | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Quotation` type.
        if (itemToEdit) handleUpdate(`${API_URL}/quotations`, { ...itemToEdit, ...data }, setQuotations);
        else handleAdd(`${API_URL}/quotations`, data, setQuotations);
    };
    const handleBudgetSubmit = (data: Omit<BudgetType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: BudgetType | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `BudgetType` type.
        if (itemToEdit) handleUpdate(`${API_URL}/budgets`, { ...itemToEdit, ...data }, setBudgets);
        else handleAdd(`${API_URL}/budgets`, data, setBudgets);
    };
    const handleFestivalSubmit = (data: Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Festival | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Festival` type.
        if (itemToEdit) handleUpdate(`${API_URL}/festivals`, { ...itemToEdit, ...data }, setFestivals);
        else handleAdd(`${API_URL}/festivals`, data, setFestivals);
    };
    const handleTaskSubmit = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Task | null) => {
        // FIX: Spread `itemToEdit` to include all properties required by the `Task` type.
        if (itemToEdit) handleUpdate(`${API_URL}/tasks`, { ...itemToEdit, ...data }, setTasks);
        else handleAdd(`${API_URL}/tasks`, data, setTasks);
    };
    const handleCampaignSubmit = (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Campaign | null) => {
        if (itemToEdit) handleUpdate(`${API_URL}/campaigns`, { ...itemToEdit, ...data }, setCampaigns);
        else handleAdd(`${API_URL}/campaigns`, data, setCampaigns);
    };

    const handleEventSubmit = async (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, itemToEdit: Event | null) => {
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
    };
    
    const triggerEventRefetch = useCallback(() => {
        setEventDataVersion(v => v + 1);
    }, []);

    const value = {
        contributions, campaigns, sponsors, vendors, expenses, quotations, budgets, festivals, tasks, users,
        donors, expenseHeads, festivalMap,
        fetchData,
        handleContributionSubmit, handleSponsorSubmit, handleVendorSubmit, handleExpenseSubmit, handleQuotationSubmit,
        handleBudgetSubmit, handleFestivalSubmit, handleTaskSubmit, handleEventSubmit, handleCampaignSubmit,
        handleDeleteClick, handleRestore,
        eventDataVersion,
        triggerEventRefetch
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};