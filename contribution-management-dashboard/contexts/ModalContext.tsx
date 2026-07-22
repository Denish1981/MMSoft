import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import type { ModalContextType } from './modal/types';
import { useEntityModals } from './modal/useEntityModals';
import { useActionModals } from './modal/useActionModals';

export type { ModalContextType };

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { hasPermission, token, logout } = useAuth();
    const { fetchData, triggerEventRefetch } = useData();

    const entityModals = useEntityModals({ hasPermission });
    const actionModals = useActionModals({
        hasPermission,
        token,
        logout,
        fetchData,
        triggerEventRefetch,
    });

    const value: ModalContextType = {
        ...entityModals,
        ...actionModals,
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
