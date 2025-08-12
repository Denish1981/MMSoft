
import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Contributions from './pages/Donations';
import Donors from './pages/Donors';
import Campaigns from './pages/Campaigns';
import AiInsights from './pages/AiInsights';
import Sponsors from './pages/Sponsors';
import Vendors from './pages/Vendors';
import Expenses from './pages/Expenses';
import Quotations from './pages/Quotations';
import Budget from './pages/Budget';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import BulkAddPage from './pages/BulkAddPage';
import Festivals from './pages/Festivals';
import Tasks from './pages/Tasks';
import ArchivePage from './pages/Archive';
import { ContributionModal } from './components/DonationModal';
import { SponsorModal } from './components/SponsorModal';
import { VendorModal } from './components/VendorModal';
import { ExpenseModal } from './components/ExpenseModal';
import { QuotationModal } from './components/QuotationModal';
import { BudgetModal } from './components/BudgetModal';
import { FestivalModal } from './components/FestivalModal';
import { TaskModal } from './components/TaskModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { HistoryModal } from './components/HistoryModal';
import type { Contribution, Campaign, Donor, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType, Festival, Task, UserForManagement, HistoryItem } from './types';
import { API_URL } from './config';
import PageViewTracker from './components/PageViewTracker';

const GOOGLE_CLIENT_ID = '257342781674-s9r78geuhko5ave900nk04h88e8uau0f.apps.googleusercontent.com';

const AppContent: React.FC = () => {
    const { isAuthenticated, isLoading, hasPermission, logout, token } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // Data state
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
    
    // Modal visibility state
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // State for editing items
    const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
    const [sponsorToEdit, setSponsorToEdit] = useState<Sponsor | null>(null);
    const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null);
    const [budgetToEdit, setBudgetToEdit] = useState<BudgetType | null>(null);
    const [festivalToEdit, setFestivalToEdit] = useState<Festival | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    // State for deletion confirmation
    const [itemToDelete, setItemToDelete] = useState<{ id: number; type: string } | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

    // State for History Modal
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [historyTitle, setHistoryTitle] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    });

    const fetchData = async () => {
        if (!isAuthenticated) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [
                contributionsRes, campaignsRes, sponsorsRes, vendorsRes, expensesRes, quotationsRes, budgetsRes, festivalsRes, tasksRes, usersRes
            ] = await Promise.all([
                fetch(`${API_URL}/contributions`, { headers }), fetch(`${API_URL}/campaigns`, { headers }),
                fetch(`${API_URL}/sponsors`, { headers }), fetch(`${API_URL}/vendors`, { headers }),
                fetch(`${API_URL}/expenses`, { headers }), fetch(`${API_URL}/quotations`, { headers }),
                fetch(`${API_URL}/budgets`, { headers }), fetch(`${API_URL}/festivals`, { headers }),
                fetch(`${API_URL}/tasks`, { headers }), fetch(`${API_URL}/users/management`, { headers })
            ]);
            
            const allResponses = [contributionsRes, campaignsRes, sponsorsRes, vendorsRes, expensesRes, quotationsRes, budgetsRes, festivalsRes, tasksRes, usersRes];
            if (allResponses.some(res => res.status === 401)) {
                logout();
                return;
            }

            setContributions(await contributionsRes.json());
            setCampaigns(await campaignsRes.json());
            setSponsors(await sponsorsRes.json());
            setVendors(await vendorsRes.json());
            setExpenses(await expensesRes.json());
            setQuotations(await quotationsRes.json());
            setBudgets(await budgetsRes.json());
            setFestivals(await festivalsRes.json());
            setTasks(await tasksRes.json());

            if (usersRes.ok) {
                setUsers(await usersRes.json());
            } else {
                setUsers([]); // Prevent crash for users without permission
                console.warn(`Could not fetch user management data: Status ${usersRes.status}`);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchData();
        }
    }, [isAuthenticated, token]);

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

    const confirmMessage = useMemo(() => {
        if (!itemToDelete) return '';
        const itemType = itemToDelete.type.slice(0, -1);
        return `Are you sure you want to archive this ${itemType}? It can be restored later from the Archive page.`;
    }, [itemToDelete]);
    
    // --- Generic CRUD Handlers ---
    const handleAdd = async <T extends { id: any }>(url: string, body: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, setData: React.Dispatch<React.SetStateAction<T[]>>, closeModal?: () => void) => {
        try {
            const response = await fetch(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to add item`);
            }
            const newItem: T = await response.json();
            setData((prev: T[]) => [newItem, ...prev]);
            if (closeModal) closeModal();
        } catch (error) {
            console.error(`Failed to add item:`, error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        }
    };

    const handleUpdate = async <T extends {id: number}>(url: string, body: T, setData: React.Dispatch<React.SetStateAction<T[]>>, closeModal: () => void) => {
        try {
            const response = await fetch(`${url}/${body.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) });
            if (response.status === 401) { logout(); return; }
            const updatedItem: T = await response.json();
            setData((prev: T[]) => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
            closeModal();
        } catch (error) {
            console.error(`Failed to update item:`, error);
        }
    };

    const handleDeleteClick = (id: number, type: string) => {
        if (!hasPermission('action:delete')) {
            alert("You don't have permission to archive items.");
            return;
        }
        setItemToDelete({ id, type });
        setIsConfirmationModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        
        try {
            const response = await fetch(`${API_URL}/${type}/${id}`, { 
                method: 'DELETE', 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) { 
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to archive ${type}`);
            }
            
            await fetchData(); // Re-fetch all data to ensure UI is in sync with the server

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsConfirmationModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleRestore = async (recordType: string, recordId: number) => {
        if (!hasPermission('action:restore')) {
            alert("You don't have permission to restore items.");
            return;
        }
        try {
            const response = await fetch(`${API_URL}/${recordType}/${recordId}/restore`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to restore item`);
            }
            await fetchData(); // Refresh data to reflect the restored item
        } catch (error) {
            console.error('Failed to restore item:', error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        }
    };

    const handleViewHistory = async (recordType: string, recordId: number, title: string) => {
        if (!token) return;
        setHistoryTitle(title);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        setHistoryData([]);

        try {
            const response = await fetch(`${API_URL}/${recordType}/${recordId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                logout();
                return;
            }
            if (!response.ok) throw new Error(`Failed to fetch history for ${recordType}`);
            const data: HistoryItem[] = await response.json();
            setHistoryData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingHistory(false);
        }
    };
    
    // --- Specific Modal/Submit Handlers ---
    const openModal = (setter: React.Dispatch<React.SetStateAction<boolean>>, permission: string, itemToEditSetter?: (item: any) => void, item?: any) => {
        const requiredPermission = item ? 'action:edit' : 'action:create';
        if (!hasPermission(requiredPermission)) {
            alert(`You do not have permission to ${item ? 'edit' : 'create'} this item.`);
            return;
        }
        if (itemToEditSetter) itemToEditSetter(item);
        setter(true);
    };

    const handleContributionSubmit = (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (contributionToEdit) handleUpdate(`${API_URL}/contributions`, { ...data, id: contributionToEdit.id, createdAt: contributionToEdit.createdAt, updatedAt: contributionToEdit.updatedAt }, setContributions, () => setIsContributionModalOpen(false));
        else handleAdd(`${API_URL}/contributions`, data, setContributions, () => setIsContributionModalOpen(false));
    };

    const handleSponsorSubmit = (data: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (sponsorToEdit) handleUpdate(`${API_URL}/sponsors`, { ...data, id: sponsorToEdit.id, createdAt: sponsorToEdit.createdAt, updatedAt: sponsorToEdit.updatedAt }, setSponsors, () => setIsSponsorModalOpen(false));
        else handleAdd(`${API_URL}/sponsors`, data, setSponsors, () => setIsSponsorModalOpen(false));
    };

    const handleVendorSubmit = (data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (vendorToEdit) handleUpdate(`${API_URL}/vendors`, { ...data, id: vendorToEdit.id, createdAt: vendorToEdit.createdAt, updatedAt: vendorToEdit.updatedAt }, setVendors, () => setIsVendorModalOpen(false));
        else handleAdd(`${API_URL}/vendors`, data, setVendors, () => setIsVendorModalOpen(false));
    };

    const handleExpenseSubmit = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (expenseToEdit) handleUpdate(`${API_URL}/expenses`, { ...data, id: expenseToEdit.id, createdAt: expenseToEdit.createdAt, updatedAt: expenseToEdit.updatedAt }, setExpenses, () => setIsExpenseModalOpen(false));
        else handleAdd(`${API_URL}/expenses`, data, setExpenses, () => setIsExpenseModalOpen(false));
    };

    const handleQuotationSubmit = (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (quotationToEdit) handleUpdate(`${API_URL}/quotations`, { ...data, id: quotationToEdit.id, createdAt: quotationToEdit.createdAt, updatedAt: quotationToEdit.updatedAt }, setQuotations, () => setIsQuotationModalOpen(false));
        else handleAdd(`${API_URL}/quotations`, data, setQuotations, () => setIsQuotationModalOpen(false));
    };
    
    const handleBudgetSubmit = (data: Omit<BudgetType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (budgetToEdit) handleUpdate(`${API_URL}/budgets`, { ...data, id: budgetToEdit.id, createdAt: budgetToEdit.createdAt, updatedAt: budgetToEdit.updatedAt }, setBudgets, () => setIsBudgetModalOpen(false));
        else handleAdd(`${API_URL}/budgets`, data, setBudgets, () => setIsBudgetModalOpen(false));
    };

    const handleFestivalSubmit = (data: Omit<Festival, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (festivalToEdit) handleUpdate(`${API_URL}/festivals`, { ...data, id: festivalToEdit.id, createdAt: festivalToEdit.createdAt, updatedAt: festivalToEdit.updatedAt }, setFestivals, () => setIsFestivalModalOpen(false));
        else handleAdd(`${API_URL}/festivals`, data, setFestivals, () => setIsFestivalModalOpen(false));
    };

    const handleTaskSubmit = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => {
        if (taskToEdit) handleUpdate(`${API_URL}/tasks`, { ...data, id: taskToEdit.id, createdAt: taskToEdit.createdAt, updatedAt: new Date().toISOString() }, setTasks, () => setIsTaskModalOpen(false));
        else handleAdd(`${API_URL}/tasks`, data, setTasks, () => setIsTaskModalOpen(false));
    };

    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <HashRouter>
            <PageViewTracker />
            <div className="flex h-screen bg-slate-100">
                <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
                <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                    <Header 
                        onAddContributionClick={() => openModal(setIsContributionModalOpen, 'action:create', setContributionToEdit, null)}
                        onAddSponsorClick={() => openModal(setIsSponsorModalOpen, 'action:create', setSponsorToEdit, null)}
                        onAddVendorClick={() => openModal(setIsVendorModalOpen, 'action:create', setVendorToEdit, null)}
                        onAddExpenseClick={() => openModal(setIsExpenseModalOpen, 'action:create', setExpenseToEdit, null)}
                        onAddQuotationClick={() => openModal(setIsQuotationModalOpen, 'action:create', setQuotationToEdit, null)}
                        onAddBudgetClick={() => openModal(setIsBudgetModalOpen, 'action:create', setBudgetToEdit, null)}
                        onAddFestivalClick={() => openModal(setIsFestivalModalOpen, 'action:create', setFestivalToEdit, null)}
                        onAddTaskClick={() => openModal(setIsTaskModalOpen, 'action:create', setTaskToEdit, null)}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
                        <Routes>
                            <Route path="/login" element={<Navigate to="/" />} />
                            <Route path="/forbidden" element={<ForbiddenPage />} />

                            <Route path="/" element={<ProtectedRoute permission="page:dashboard:view"><Dashboard contributions={contributions} donors={donors} sponsors={sponsors} expenses={expenses} /></ProtectedRoute>} />
                            <Route path="/contributions" element={<ProtectedRoute permission="page:contributions:view"><Contributions contributions={contributions} campaigns={campaigns} onEdit={(item) => openModal(setIsContributionModalOpen, 'action:edit', setContributionToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'contributions')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/bulk-add" element={<ProtectedRoute permission="page:bulk-add:view"><BulkAddPage campaigns={campaigns} onBulkSaveSuccess={fetchData} /></ProtectedRoute>} />
                            <Route path="/donors" element={<ProtectedRoute permission="page:donors:view"><Donors donors={donors} /></ProtectedRoute>} />
                            <Route path="/sponsors" element={<ProtectedRoute permission="page:sponsors:view"><Sponsors sponsors={sponsors} onEdit={(item) => openModal(setIsSponsorModalOpen, 'action:edit', setSponsorToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'sponsors')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/vendors" element={<ProtectedRoute permission="page:vendors:view"><Vendors vendors={vendors} onEdit={(item) => openModal(setIsVendorModalOpen, 'action:edit', setVendorToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'vendors')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/expenses" element={<ProtectedRoute permission="page:expenses:view"><Expenses expenses={expenses} vendors={vendors} festivals={festivals} onEdit={(item) => openModal(setIsExpenseModalOpen, 'action:edit', setExpenseToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'expenses')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/quotations" element={<ProtectedRoute permission="page:quotations:view"><Quotations quotations={quotations} vendors={vendors} festivals={festivals} onEdit={(item) => openModal(setIsQuotationModalOpen, 'action:edit', setQuotationToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'quotations')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/budget" element={<ProtectedRoute permission="page:budget:view"><Budget budgets={budgets} festivals={festivals} onEdit={(item) => openModal(setIsBudgetModalOpen, 'action:edit', setBudgetToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'budgets')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/campaigns" element={<ProtectedRoute permission="page:campaigns:view"><Campaigns campaigns={campaigns} contributions={contributions}/></ProtectedRoute>} />
                            <Route path="/festivals" element={<ProtectedRoute permission="page:festivals:view"><Festivals festivals={festivals} campaigns={campaigns} onEdit={(item) => openModal(setIsFestivalModalOpen, 'action:edit', setFestivalToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'festivals')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/tasks" element={<ProtectedRoute permission="page:tasks:view"><Tasks tasks={tasks} festivals={festivals} users={users} onEdit={(item) => openModal(setIsTaskModalOpen, 'action:edit', setTaskToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'tasks')} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute permission="page:reports:view"><Reports contributions={contributions} vendors={vendors} expenses={expenses} quotations={quotations} budgets={budgets} festivals={festivals} tasks={tasks} users={users} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            <Route path="/ai-insights" element={<ProtectedRoute permission="page:ai-insights:view"><AiInsights /></ProtectedRoute>} />
                            <Route path="/user-management" element={<ProtectedRoute permission="page:user-management:view"><UserManagement /></ProtectedRoute>} />
                            <Route path="/archive" element={<ProtectedRoute permission="page:archive:view"><ArchivePage onRestore={handleRestore} onViewHistory={handleViewHistory} /></ProtectedRoute>} />
                            
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                </div>
                 {isContributionModalOpen && <ContributionModal campaigns={campaigns} contributionToEdit={contributionToEdit} onClose={() => { setIsContributionModalOpen(false); setContributionToEdit(null); }} onSubmit={handleContributionSubmit} />}
                 {isSponsorModalOpen && <SponsorModal sponsorToEdit={sponsorToEdit} onClose={() => { setIsSponsorModalOpen(false); setSponsorToEdit(null); }} onSubmit={handleSponsorSubmit} />}
                 {isVendorModalOpen && <VendorModal vendorToEdit={vendorToEdit} onClose={() => { setIsVendorModalOpen(false); setVendorToEdit(null); }} onSubmit={handleVendorSubmit} />}
                 {isExpenseModalOpen && <ExpenseModal vendors={vendors} expenses={expenses} festivals={festivals} expenseToEdit={expenseToEdit} onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }} onSubmit={handleExpenseSubmit} />}
                 {isQuotationModalOpen && <QuotationModal vendors={vendors} festivals={festivals} quotationToEdit={quotationToEdit} onClose={() => { setIsQuotationModalOpen(false); setQuotationToEdit(null); }} onSubmit={handleQuotationSubmit} />}
                 {isBudgetModalOpen && <BudgetModal expenseHeads={expenseHeads} festivals={festivals} budgetToEdit={budgetToEdit} onClose={() => { setIsBudgetModalOpen(false); setBudgetToEdit(null); }} onSubmit={handleBudgetSubmit} />}
                 {isFestivalModalOpen && <FestivalModal campaigns={campaigns} festivalToEdit={festivalToEdit} onClose={() => { setIsFestivalModalOpen(false); setFestivalToEdit(null); }} onSubmit={handleFestivalSubmit} />}
                 {isTaskModalOpen && <TaskModal users={users} festivals={festivals} taskToEdit={taskToEdit} onClose={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }} onSubmit={handleTaskSubmit} />}
                 {isConfirmationModalOpen && <ConfirmationModal onConfirm={confirmDelete} onCancel={() => setIsConfirmationModalOpen(false)} message={confirmMessage} confirmText="Yes, Archive" />}
                 {isHistoryModalOpen && <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={historyTitle} history={historyData} isLoading={isLoadingHistory} festivalMap={festivalMap} />}
            </div>
        </HashRouter>
    );
};

const App: React.FC = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
