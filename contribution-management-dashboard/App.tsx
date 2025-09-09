import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ModalProvider } from './contexts/ModalContext';
import ProtectedRoute from './components/ProtectedRoute';

import { ProtectedLayout } from './layouts/ProtectedLayout';
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
import Events from './pages/Events';
import ArchivePage from './pages/Archive';
import PageViewTracker from './components/PageViewTracker';
import PublicHomePage from './pages/PublicHome';
import PhotoAlbumPage from './pages/PhotoAlbum';
import FestivalPhotosPage from './pages/FestivalPhotosPage';
import PhotoAlbumsListPage from './pages/PhotoAlbumsListPage';


const GOOGLE_CLIENT_ID = '257342781674-s9r78geuhko5ave900nk04h88e8uau0f.apps.googleusercontent.com';

const App: React.FC = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <DataProvider>
                    <ModalProvider>
                        <HashRouter>
                            <PageViewTracker />
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<PublicHomePage />} />
                                <Route path="/photos" element={<PhotoAlbumsListPage />} />
                                <Route path="/album/:id" element={<PhotoAlbumPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                
                                {/* Protected Routes */}
                                <Route element={<ProtectedLayout />}>
                                    <Route path="/dashboard" element={<ProtectedRoute permission="page:dashboard:view"><Dashboard /></ProtectedRoute>} />
                                    <Route path="/contributions" element={<ProtectedRoute permission="page:contributions:view"><Contributions /></ProtectedRoute>} />
                                    <Route path="/bulk-add" element={<ProtectedRoute permission="page:bulk-add:view"><BulkAddPage /></ProtectedRoute>} />
                                    <Route path="/donors" element={<ProtectedRoute permission="page:donors:view"><Donors /></ProtectedRoute>} />
                                    <Route path="/sponsors" element={<ProtectedRoute permission="page:sponsors:view"><Sponsors /></ProtectedRoute>} />
                                    <Route path="/vendors" element={<ProtectedRoute permission="page:vendors:view"><Vendors /></ProtectedRoute>} />
                                    <Route path="/expenses" element={<ProtectedRoute permission="page:expenses:view"><Expenses /></ProtectedRoute>} />
                                    <Route path="/quotations" element={<ProtectedRoute permission="page:quotations:view"><Quotations /></ProtectedRoute>} />
                                    <Route path="/budget" element={<ProtectedRoute permission="page:budget:view"><Budget /></ProtectedRoute>} />
                                    <Route path="/campaigns" element={<ProtectedRoute permission="page:campaigns:view"><Campaigns /></ProtectedRoute>} />
                                    <Route path="/festivals" element={<ProtectedRoute permission="page:festivals:view"><Festivals /></ProtectedRoute>} />
                                    <Route path="/festivals/:id/photos" element={<ProtectedRoute permission="page:festivals:view"><FestivalPhotosPage /></ProtectedRoute>} />
                                    <Route path="/festivals/:id/events" element={<ProtectedRoute permission="page:events:view"><Events /></ProtectedRoute>} />
                                    <Route path="/tasks" element={<ProtectedRoute permission="page:tasks:view"><Tasks /></ProtectedRoute>} />
                                    <Route path="/reports" element={<ProtectedRoute permission="page:reports:view"><Reports /></ProtectedRoute>} />
                                    <Route path="/ai-insights" element={<ProtectedRoute permission="page:ai-insights:view"><AiInsights /></ProtectedRoute>} />
                                    <Route path="/user-management" element={<ProtectedRoute permission="page:user-management:view"><UserManagement /></ProtectedRoute>} />
                                    <Route path="/archive" element={<ProtectedRoute permission="page:archive:view"><ArchivePage /></ProtectedRoute>} />
                                    <Route path="/forbidden" element={<ForbiddenPage />} />

                                    {/* Default redirect for authenticated users */}
                                    <Route path="*" element={<Navigate to="/dashboard" />} />
                                </Route>
                            </Routes>
                        </HashRouter>
                    </ModalProvider>
                </DataProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
