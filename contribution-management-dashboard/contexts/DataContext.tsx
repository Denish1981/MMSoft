import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import type { 
    Contribution, Campaign, Sponsor, Vendor, Expense, Quotation, 
    Budget as BudgetType, Festival, Task, UserForManagement, StallRegistration 
} from '../types/index';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import type { DataContextType } from './data/types';
import { useDerivedData } from './data/useDerivedData';
import { useDataHandlers } from './data/useDataHandlers';

export type { DataContextType };

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
    const [stallRegistrations, setStallRegistrations] = useState<StallRegistration[]>([]);
    const [eventDataVersion, setEventDataVersion] = useState(0);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');

    const fetchData = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const resPromises = [
                fetch(`${API_URL}/contributions`, { headers }), fetch(`${API_URL}/campaigns`, { headers }),
                fetch(`${API_URL}/sponsors`, { headers }), fetch(`${API_URL}/vendors`, { headers }),
                fetch(`${API_URL}/expenses`, { headers }), fetch(`${API_URL}/quotations`, { headers }),
                fetch(`${API_URL}/budgets`, { headers }), fetch(`${API_URL}/festivals`, { headers }),
                fetch(`${API_URL}/tasks`, { headers }), fetch(`${API_URL}/users/management`, { headers }),
                fetch(`${API_URL}/stall-registrations`, { headers })
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
            setUsers(data[9] || []);
            setStallRegistrations(data[10] || []);

        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    }, [isAuthenticated, token, logout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (campaigns.length > 0) {
            const active = campaigns.find(c => c.isActive);
            if (active && selectedCampaignId === 'all') {
                setSelectedCampaignId(String(active.id));
            }
        }
    }, [campaigns]);

    const { donors, expenseHeads, festivalMap } = useDerivedData(contributions, expenses, festivals);

    const handlers = useDataHandlers({
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
    });

    const triggerEventRefetch = useCallback(() => {
        setEventDataVersion(v => v + 1);
    }, []);

    const value: DataContextType = {
        contributions, campaigns, sponsors, vendors, expenses, quotations, budgets, festivals, tasks, users,
        donors, stallRegistrations, expenseHeads, festivalMap,
        fetchData,
        ...handlers,
        eventDataVersion,
        triggerEventRefetch,
        selectedCampaignId,
        setSelectedCampaignId
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
