
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
import { ContributionModal } from './components/DonationModal';
import { SponsorModal } from './components/SponsorModal';
import { VendorModal } from './components/VendorModal';
import { ExpenseModal } from './components/ExpenseModal';
import { QuotationModal } from './components/QuotationModal';
import { BudgetModal } from './components/BudgetModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import type { Contribution, Campaign, Donor, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType } from './types';
import { API_URL } from './config';
import PageViewTracker from './components/PageViewTracker';

const GOOGLE_CLIENT_ID = '257342781674-s9r78geuhko5ave900nk04h88e8uau0f.apps.googleusercontent.com';

const AppContent: React.FC = () => {
    const { isAuthenticated, user, isLoading, hasPermission, logout } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // Data state
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [budgets, setBudgets] = useState<BudgetType[]>([]);
    
    // Modal visibility state
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

    // State for editing items
    const [contributionToEdit, setContributionToEdit] = useState<Contribution | null>(null);
    const [sponsorToEdit, setSponsorToEdit] = useState<Sponsor | null>(null);
    const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null);
    const [budgetToEdit, setBudgetToEdit] = useState<BudgetType | null>(null);

    // State for deletion confirmation
    const [itemToDelete, setItemToDelete] = useState<{ id: string | number; type: string } | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

    const fetchData = async () => {
        if (!isAuthenticated) return;
        try {
            const [
                contributionsRes, campaignsRes, sponsorsRes, vendorsRes, expensesRes, quotationsRes, budgetsRes
            ] = await Promise.all([
                fetch(`${API_URL}/contributions`), fetch(`${API_URL}/campaigns`),
                fetch(`${API_URL}/sponsors`), fetch(`${API_URL}/vendors`),
                fetch(`${API_URL}/expenses`), fetch(`${API_URL}/quotations`),
                fetch(`${API_URL}/budgets`),
            ]);

            setContributions(await contributionsRes.json());
            setCampaigns(await campaignsRes.json());
            setSponsors(await sponsorsRes.json());
            setVendors(await vendorsRes.json());
            setExpenses(await expensesRes.json());
            setQuotations(await quotationsRes.json());
            setBudgets(await budgetsRes.json());
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

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
        return `Are you sure you want to delete this ${itemType}? This action cannot be undone.`;
    }, [itemToDelete]);
    
    // --- Generic CRUD Handlers ---
    const handleAdd = async <T extends { id: any }>(url: string, body: Omit<T, 'id'>, setData: React.Dispatch<React.SetStateAction<T[]>>, closeModal?: () => void) => {
        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to add item`);
            }
            const newItem = await response.json();
            setData(prev => [newItem, ...prev]);
            if (closeModal) closeModal();
        } catch (error) {
            console.error(`Failed to add item:`, error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        }
    };

    const handleUpdate = async <T extends {id: string}>(url: string, body: T, setData: React.Dispatch<React.SetStateAction<T[]>>, closeModal: () => void) => {
        try {
            const response = await fetch(`${url}/${body.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const updatedItem = await response.json();
            setData(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
            closeModal();
        } catch (error) {
            console.error(`Failed to update item:`, error);
        }
    };

    const handleDeleteClick = (id: string | number, type: string) => {
        if (!hasPermission('action:delete')) {
            alert("You don't have permission to delete items.");
            return;
        }
        setItemToDelete({ id, type });
        setIsConfirmationModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        const endpointMap: { [key: string]: string } = {
            contributions: 'contributions', sponsors: 'sponsors', vendors: 'vendors',
            expenses: 'expenses', quotations: 'quotations', budgets: 'budgets',
        };
        const endpoint = endpointMap[type];
        if (!endpoint) {
            console.warn(`Unhandled delete type: ${type}`);
            setIsConfirmationModalOpen(false);
            return;
        }
        try {
            const response = await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
            if (!response.ok) { throw new Error(`Failed to delete ${type}`); }
            const setDataMap = {
                contributions: setContributions, sponsors: setSponsors, vendors: setVendors,
                expenses: setExpenses, quotations: setQuotations, budgets: setBudgets,
            };
            setDataMap[type](prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsConfirmationModalOpen(false);
            setItemToDelete(null);
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

    const handleContributionSubmit = (data: Omit<Contribution, 'id'>) => {
        if (contributionToEdit) handleUpdate(`${API_URL}/contributions`, { ...data, id: contributionToEdit.id }, setContributions, () => setIsContributionModalOpen(false));
        else handleAdd(`${API_URL}/contributions`, data, setContributions, () => setIsContributionModalOpen(false));
    };

    const handleSponsorSubmit = (data: Omit<Sponsor, 'id'>) => {
        if (sponsorToEdit) handleUpdate(`${API_URL}/sponsors`, { ...data, id: sponsorToEdit.id }, setSponsors, () => setIsSponsorModalOpen(false));
        else handleAdd(`${API_URL}/sponsors`, data, setSponsors, () => setIsSponsorModalOpen(false));
    };

    const handleVendorSubmit = (data: Omit<Vendor, 'id'>) => {
        if (vendorToEdit) handleUpdate(`${API_URL}/vendors`, { ...data, id: vendorToEdit.id }, setVendors, () => setIsVendorModalOpen(false));
        else handleAdd(`${API_URL}/vendors`, data, setVendors, () => setIsVendorModalOpen(false));
    };

    const handleExpenseSubmit = (data: Omit<Expense, 'id'>) => {
        if (expenseToEdit) handleUpdate(`${API_URL}/expenses`, { ...data, id: expenseToEdit.id }, setExpenses, () => setIsExpenseModalOpen(false));
        else handleAdd(`${API_URL}/expenses`, data, setExpenses, () => setIsExpenseModalOpen(false));
    };

    const handleQuotationSubmit = (data: Omit<Quotation, 'id'>) => {
        if (quotationToEdit) handleUpdate(`${API_URL}/quotations`, { ...data, id: quotationToEdit.id }, setQuotations, () => setIsQuotationModalOpen(false));
        else handleAdd(`${API_URL}/quotations`, data, setQuotations, () => setIsQuotationModalOpen(false));
    };
    
    const handleBudgetSubmit = (data: Omit<BudgetType, 'id'>) => {
        if (budgetToEdit) handleUpdate(`${API_URL}/budgets`, { ...data, id: budgetToEdit.id }, setBudgets, () => setIsBudgetModalOpen(false));
        else handleAdd(`${API_URL}/budgets`, data, setBudgets, () => setIsBudgetModalOpen(false));
    };

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
                        onLogout={logout}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
                        <Routes>
                            <Route path="/login" element={<Navigate to="/" />} />
                            <Route path="/forbidden" element={<ForbiddenPage />} />

                            <Route path="/" element={<ProtectedRoute permission="page:dashboard:view"><Dashboard contributions={contributions} donors={donors} sponsors={sponsors} expenses={expenses} /></ProtectedRoute>} />
                            <Route path="/contributions" element={<ProtectedRoute permission="page:contributions:view"><Contributions contributions={contributions} campaigns={campaigns} onEdit={(item) => openModal(setIsContributionModalOpen, 'action:edit', setContributionToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'contributions')} /></ProtectedRoute>} />
                            <Route path="/bulk-add" element={<ProtectedRoute permission="page:bulk-add:view"><BulkAddPage campaigns={campaigns} onBulkSaveSuccess={fetchData} /></ProtectedRoute>} />
                            <Route path="/donors" element={<ProtectedRoute permission="page:donors:view"><Donors donors={donors} /></ProtectedRoute>} />
                            <Route path="/sponsors" element={<ProtectedRoute permission="page:sponsors:view"><Sponsors sponsors={sponsors} onEdit={(item) => openModal(setIsSponsorModalOpen, 'action:edit', setSponsorToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'sponsors')} /></ProtectedRoute>} />
                            <Route path="/vendors" element={<ProtectedRoute permission="page:vendors:view"><Vendors vendors={vendors} onEdit={(item) => openModal(setIsVendorModalOpen, 'action:edit', setVendorToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'vendors')} /></ProtectedRoute>} />
                            <Route path="/expenses" element={<ProtectedRoute permission="page:expenses:view"><Expenses expenses={expenses} vendors={vendors} onEdit={(item) => openModal(setIsExpenseModalOpen, 'action:edit', setExpenseToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'expenses')} /></ProtectedRoute>} />
                            <Route path="/quotations" element={<ProtectedRoute permission="page:quotations:view"><Quotations quotations={quotations} vendors={vendors} onEdit={(item) => openModal(setIsQuotationModalOpen, 'action:edit', setQuotationToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'quotations')} /></ProtectedRoute>} />
                            <Route path="/budget" element={<ProtectedRoute permission="page:budget:view"><Budget budgets={budgets} onEdit={(item) => openModal(setIsBudgetModalOpen, 'action:edit', setBudgetToEdit, item)} onDelete={(id) => handleDeleteClick(id, 'budgets')} /></ProtectedRoute>} />
                            <Route path="/campaigns" element={<ProtectedRoute permission="page:campaigns:view"><Campaigns campaigns={campaigns} contributions={contributions}/></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute permission="page:reports:view"><Reports contributions={contributions} vendors={vendors} expenses={expenses} quotations={quotations} budgets={budgets} /></ProtectedRoute>} />
                            <Route path="/ai-insights" element={<ProtectedRoute permission="page:ai-insights:view"><AiInsights /></ProtectedRoute>} />
                            <Route path="/user-management" element={<ProtectedRoute permission="page:user-management:view"><UserManagement /></ProtectedRoute>} />
                            
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                </div>
                 {isContributionModalOpen && <ContributionModal campaigns={campaigns} contributionToEdit={contributionToEdit} onClose={() => { setIsContributionModalOpen(false); setContributionToEdit(null); }} onSubmit={handleContributionSubmit} />}
                 {isSponsorModalOpen && <SponsorModal sponsorToEdit={sponsorToEdit} onClose={() => { setIsSponsorModalOpen(false); setSponsorToEdit(null); }} onSubmit={handleSponsorSubmit} />}
                 {isVendorModalOpen && <VendorModal vendorToEdit={vendorToEdit} onClose={() => { setIsVendorModalOpen(false); setVendorToEdit(null); }} onSubmit={handleVendorSubmit} />}
                 {isExpenseModalOpen && <ExpenseModal vendors={vendors} expenses={expenses} expenseToEdit={expenseToEdit} onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }} onSubmit={handleExpenseSubmit} />}
                 {isQuotationModalOpen && <QuotationModal vendors={vendors} quotationToEdit={quotationToEdit} onClose={() => { setIsQuotationModalOpen(false); setQuotationToEdit(null); }} onSubmit={handleQuotationSubmit} />}
                 {isBudgetModalOpen && <BudgetModal expenseHeads={expenseHeads} budgetToEdit={budgetToEdit} onClose={() => { setIsBudgetModalOpen(false); setBudgetToEdit(null); }} onSubmit={handleBudgetSubmit} />}
                 {isConfirmationModalOpen && <ConfirmationModal onConfirm={confirmDelete} onCancel={() => setIsConfirmationModalOpen(false)} message={confirmMessage} />}
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
