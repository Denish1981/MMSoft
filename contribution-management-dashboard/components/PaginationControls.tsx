import React from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface PaginationControlsProps {
    rowsPerPage: number;
    setRowsPerPage: (rows: number) => void;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    totalPages,
    totalItems,
    onPreviousPage,
    onNextPage,
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-4 border-t border-slate-200 gap-4">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
                <span>Rows per page:</span>
                <select
                    value={rowsPerPage}
                    onChange={e => setRowsPerPage(Number(e.target.value))}
                    className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Rows per page"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
            </div>
            <div className="text-sm text-slate-600" aria-live="polite">
                Page {totalPages > 0 ? currentPage : 0} of {totalPages} ({totalItems} items)
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={onPreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onNextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
