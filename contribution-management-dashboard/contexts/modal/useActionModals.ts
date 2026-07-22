import { useState, useMemo, useCallback } from 'react';
import type { HistoryItem } from '../../types/index';
import { API_URL } from '../../config';

interface UseActionModalsProps {
    hasPermission: (permission: string) => boolean;
    token: string | null;
    logout: () => void;
    fetchData: () => Promise<void>;
    triggerEventRefetch: () => void;
}

export function useActionModals({
    hasPermission,
    token,
    logout,
    fetchData,
    triggerEventRefetch,
}: UseActionModalsProps) {
    // Confirmation modal state
    const [itemToDelete, setItemToDelete] = useState<{ id: number; type: string } | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [onDeleteSuccessCallback, setOnDeleteSuccessCallback] = useState<(() => void) | null>(null);

    const { message: confirmMessage, text: confirmText } = useMemo(() => {
        if (!itemToDelete) return { message: '', text: '' };

        if (itemToDelete.type.includes('registrations')) {
            return {
                message: 'Are you sure you want to permanently delete this registration? This action cannot be undone.',
                text: 'Yes, Delete Permanently'
            };
        }

        const itemType = itemToDelete.type.slice(0, -1);
        return {
            message: `Are you sure you want to archive this ${itemType}? It can be restored later from the Archive page.`,
            text: 'Yes, Archive'
        };
    }, [itemToDelete]);

    // History modal state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [historyTitle, setHistoryTitle] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const openConfirmationModal = useCallback((id: number, type: string, onDeleteSuccess?: () => void) => {
        const permission = type.includes('registrations') ? 'action:delete' : 'action:delete';
        if (!hasPermission(permission)) {
            alert("You don't have permission to perform this action.");
            return;
        }
        setItemToDelete({ id, type });
        setOnDeleteSuccessCallback(onDeleteSuccess ? () => onDeleteSuccess : null);
        setIsConfirmationModalOpen(true);
    }, [hasPermission]);

    const closeConfirmationModal = useCallback(() => {
        setIsConfirmationModalOpen(false);
        setOnDeleteSuccessCallback(null);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;
        const url = `${API_URL}/${type}/${id}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to process request for ${type}`);
            }

            if (onDeleteSuccessCallback) {
                onDeleteSuccessCallback();
            } else if (type === 'events') {
                triggerEventRefetch();
            } else {
                await fetchData();
            }
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsConfirmationModalOpen(false);
            setItemToDelete(null);
            setOnDeleteSuccessCallback(null);
        }
    }, [itemToDelete, token, logout, onDeleteSuccessCallback, triggerEventRefetch, fetchData]);

    const openHistoryModal = useCallback(async (recordType: string, recordId: number, title: string) => {
        if (!token) return;
        setHistoryTitle(title);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        setHistoryData([]);

        try {
            const response = await fetch(`${API_URL}/${recordType}/${recordId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) { logout(); return; }
            if (!response.ok) throw new Error(`Failed to fetch history for ${recordType}`);
            const data: HistoryItem[] = await response.json();
            setHistoryData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [token, logout]);

    const closeHistoryModal = useCallback(() => {
        setIsHistoryModalOpen(false);
    }, []);

    return {
        isConfirmationModalOpen,
        confirmMessage,
        confirmText,
        openConfirmationModal,
        closeConfirmationModal,
        confirmDelete,
        isHistoryModalOpen,
        historyData,
        historyTitle,
        isLoadingHistory,
        openHistoryModal,
        closeHistoryModal,
    };
}
