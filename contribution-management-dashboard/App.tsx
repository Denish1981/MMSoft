

import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
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
import { ContributionModal } from './components/DonationModal';
import { SponsorModal } from './components/SponsorModal';
import { VendorModal } from './components/VendorModal';
import { ExpenseModal } from './components/ExpenseModal';
import { QuotationModal } from './components/QuotationModal';
import { BudgetModal } from './components/BudgetModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import type { Contribution, Campaign, Donor, Sponsor, Vendor, Expense, Quotation, Budget as BudgetType } from './types';
import { API_URL } from './config';

// IMPORTANT: Replace with your actual Google Client ID from the Google Cloud Console
const GOOGLE_CLIENT_ID = '257342781674-s9r78geuhko5ave900nk04h88e8uau0f.apps.googleusercontent.com';

const ADMIN_EMAIL = 'denishpatel1981@gmail.com';

type AuthorizedEmail = { id: number; email: string };

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [budgets, setBudgets] = useState<BudgetType[]>([]);
    const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmail[]>([]);
    
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

    const isAdmin = useMemo(() => currentUser?.email === ADMIN_EMAIL, [currentUser]);

    // Effect to check for persisted user on app load
    useEffect(() => {
        const savedUser = localStorage.getItem('contribution-os-user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                localStorage.removeItem('contribution-os-user');
            }
        }
    }, []);


    const fetchData = async () => {
        if (!isAuthenticated) return;
        try {
            const [
                contributionsRes, campaignsRes, sponsorsRes, vendorsRes, expensesRes, quotationsRes, budgetsRes, authorizedEmailsRes
            ] = await Promise.all([
                fetch(`${API_URL}/contributions`), fetch(`${API_URL}/campaigns`),
                fetch(`${API_URL}/sponsors`), fetch(`${API_URL}/vendors`),
                fetch(`${API_URL}/expenses`), fetch(`${API_URL}/quotations`),
                fetch(`${API_URL}/budgets`), fetch(`${API_URL}/authorized-emails`),
            ]);

            setContributions(await contributionsRes.json());
            setCampaigns(await campaignsRes.json());
            setSponsors(await sponsorsRes.json());
            setVendors(await vendorsRes.json());
            setExpenses(await expensesRes.json());
            setQuotations(await quotationsRes.json());
            setBudgets(await budgetsRes.json());
            setAuthorizedEmails(await authorizedEmailsRes.json());
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    useEffect(() => {
        fetchData();
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
        let itemType = 'item';
        switch (itemToDelete.type) {
            case 'authorizedEmails':
                itemType = 'email';
                break;
            case 'budgets':
                itemType = 'budget item';
                break;
            default:
                itemType = itemToDelete.type.slice(0, -1);
        }
        return `Are you sure you want to delete this ${itemType}? This action cannot be undone.`;
    }, [itemToDelete]);
    
    const handleLogin = async (user: string, pass: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass }),
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentUser(data.user);
                setIsAuthenticated(true);
                localStorage.setItem('contribution-os-user', JSON.stringify(data.user));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    };
    
    const handleGoogleLogin = async (token: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
             if (response.ok) {
                const data = await response.json();
                setCurrentUser(data.user);
                setIsAuthenticated(true);
                localStorage.setItem('contribution-os-user', JSON.stringify(data.user));
                return { success: true };
            }
            // Handle specific error messages from the backend
            const errorData = await response.json();
            return { success: false, message: errorData.message || 'An unknown error occurred.' };
        } catch (error) {
            console.error("Google login failed:", error);
            return { success: false, message: 'Could not connect to the server.' };
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem('contribution-os-user');
    };

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
        setItemToDelete({ id, type });
        setIsConfirmationModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        const endpointMap: { [key: string]: string } = {
            contributions: 'contributions',
            sponsors: 'sponsors',
            vendors: 'vendors',
            expenses: 'expenses',
            quotations: 'quotations',
            budgets: 'budgets',
            authorizedEmails: 'authorized-emails',
        };
        const endpoint = endpointMap[type];
        if (!endpoint) {
            console.warn(`Unhandled delete type: ${type}`);
            setIsConfirmationModalOpen(false);
            setItemToDelete(null);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to delete ${type}`);
            }

            switch (type) {
                case 'contributions': setContributions(prev => prev.filter(item => item.id !== id)); break;
                case 'sponsors': setSponsors(prev => prev.filter(item => item.id !== id)); break;
                case 'vendors': setVendors(prev => prev.filter(item => item.id !== id)); break;
                case 'expenses': setExpenses(prev => prev.filter(item => item.id !== id)); break;
                case 'quotations': setQuotations(prev => prev.filter(item => item.id !== id)); break;
                case 'budgets': setBudgets(prev => prev.filter(item => item.id !== id)); break;
                case 'authorizedEmails': setAuthorizedEmails(prev => prev.filter(item => item.id !== id)); break;
                default: break;
            }
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsConfirmationModalOpen(false);
            setItemToDelete(null);
        }
    };
    
    // --- Specific Handlers ---
    const handleContributionSubmit = (data: Omit<Contribution, 'id'>) => {
        if (contributionToEdit) handleUpdate(`${API_URL}/contributions`, { ...data, id: contributionToEdit.id }, setContributions, () => setIsContributionModalOpen(false));
        else handleAdd(`${API_URL}/contributions`, data, setContributions, () => setIsContributionModalOpen(false));
    };
    const openContributionModal = (item: Contribution | null) => { setContributionToEdit(item); setIsContributionModalOpen(true); };

    const handleSponsorSubmit = (data: Omit<Sponsor, 'id'>) => {
        if (sponsorToEdit) handleUpdate(`${API_URL}/sponsors`, { ...data, id: sponsorToEdit.id }, setSponsors, () => setIsSponsorModalOpen(false));
        else handleAdd(`${API_URL}/sponsors`, data, setSponsors, () => setIsSponsorModalOpen(false));
    };
    const openSponsorModal = (item: Sponsor | null) => { setSponsorToEdit(item); setIsSponsorModalOpen(true); };

    const handleVendorSubmit = (data: Omit<Vendor, 'id'>) => {
        if (vendorToEdit) handleUpdate(`${API_URL}/vendors`, { ...data, id: vendorToEdit.id }, setVendors, () => setIsVendorModalOpen(false));
        else handleAdd(`${API_URL}/vendors`, data, setVendors, () => setIsVendorModalOpen(false));
    };
    const openVendorModal = (item: Vendor | null) => { setVendorToEdit(item); setIsVendorModalOpen(true); };

    const handleExpenseSubmit = (data: Omit<Expense, 'id'>) => {
        if (expenseToEdit) handleUpdate(`${API_URL}/expenses`, { ...data, id: expenseToEdit.id }, setExpenses, () => setIsExpenseModalOpen(false));
        else handleAdd(`${API_URL}/expenses`, data, setExpenses, () => setIsExpenseModalOpen(false));
    };
    const openExpenseModal = (item: Expense | null) => { setExpenseToEdit(item); setIsExpenseModalOpen(true); };

    const handleQuotationSubmit = (data: Omit<Quotation, 'id'>) => {
        if (quotationToEdit) handleUpdate(`${API_URL}/quotations`, { ...data, id: quotationToEdit.id }, setQuotations, () => setIsQuotationModalOpen(false));
        else handleAdd(`${API_URL}/quotations`, data, setQuotations, () => setIsQuotationModalOpen(false));
    };
    const openQuotationModal = (item: Quotation | null) => { setQuotationToEdit(item); setIsQuotationModalOpen(true); };
    
    const handleBudgetSubmit = (data: Omit<BudgetType, 'id'>) => {
        if (budgetToEdit) handleUpdate(`${API_URL}/budgets`, { ...data, id: budgetToEdit.id }, setBudgets, () => setIsBudgetModalOpen(false));
        else handleAdd(`${API_URL}/budgets`, data, setBudgets, () => setIsBudgetModalOpen(false));
    };
    const openBudgetModal = (item: BudgetType | null) => { setBudgetToEdit(item); setIsBudgetModalOpen(true); };

    const handleAddEmail = (email: string) => {
        handleAdd(`${API_URL}/authorized-emails`, { email }, setAuthorizedEmails);
    };

    if (!isAuthenticated) {
        return (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <LoginPage onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />
            </GoogleOAuthProvider>
        );
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <HashRouter>
                <div className="flex h-screen bg-slate-100">
                    <Sidebar 
                        isAdmin={isAdmin}
                        isCollapsed={isSidebarCollapsed}
                        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                    <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                        <Header 
                            onAddContributionClick={() => openContributionModal(null)} 
                            onAddSponsorClick={() => openSponsorModal(null)}
                            onAddVendorClick={() => openVendorModal(null)}
                            onAddExpenseClick={() => openExpenseModal(null)}
                            onAddQuotationClick={() => openQuotationModal(null)}
                            onAddBudgetClick={() => openBudgetModal(null)}
                            onLogout={handleLogout}
                        />
                        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
                            <Routes>
                                <Route path="/" element={<Dashboard contributions={contributions} donors={donors} sponsors={sponsors} expenses={expenses} />} />
                                <Route path="/contributions" element={<Contributions contributions={contributions} campaigns={campaigns} onEdit={openContributionModal} onDelete={(id) => handleDeleteClick(id, 'contributions')} />} />
                                <Route path="/donors" element={<Donors donors={donors} />} />
                                <Route path="/sponsors" element={<Sponsors sponsors={sponsors} onEdit={openSponsorModal} onDelete={(id) => handleDeleteClick(id, 'sponsors')} />} />
                                <Route path="/vendors" element={<Vendors vendors={vendors} onEdit={openVendorModal} onDelete={(id) => handleDeleteClick(id, 'vendors')} />} />
                                <Route path="/expenses" element={<Expenses expenses={expenses} vendors={vendors} onEdit={openExpenseModal} onDelete={(id) => handleDeleteClick(id, 'expenses')} />} />
                                <Route path="/quotations" element={<Quotations quotations={quotations} vendors={vendors} onEdit={openQuotationModal} onDelete={(id) => handleDeleteClick(id, 'quotations')} />} />
                                <Route path="/budget" element={<Budget budgets={budgets} onEdit={openBudgetModal} onDelete={(id) => handleDeleteClick(id, 'budgets')} />} />
                                <Route path="/campaigns" element={<Campaigns campaigns={campaigns} contributions={contributions}/>} />
                                <Route path="/reports" element={<Reports contributions={contributions} vendors={vendors} expenses={expenses} quotations={quotations} budgets={budgets} />} />
                                <Route path="/ai-insights" element={<AiInsights />} />
                                <Route path="/user-management" element={
                                    isAdmin ? (
                                        <UserManagement emails={authorizedEmails} onAddEmail={handleAddEmail} onDelete={(id) => handleDeleteClick(id, 'authorizedEmails')} />
                                    ) : (
                                        <ForbiddenPage />
                                    )
                                } />
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
        </GoogleOAuthProvider>
    );
};

export default App;