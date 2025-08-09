import React, { useMemo } from 'react';
import type { TaskHistoryItem, Festival } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { HistoryIcon } from './icons/HistoryIcon';

interface TaskHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskTitle: string;
    history: TaskHistoryItem[];
    isLoading: boolean;
    festivalMap: Map<string, string>;
}

const formatFieldValue = (field: string, value: string | null, festivalMap: Map<string, string>): React.ReactNode => {
    if (value === null || value === 'null' || value === '') return <span className="text-slate-400 italic">None</span>;

    if (field === 'dueDate') {
        return new Date(value).toLocaleDateString();
    }
    if (field === 'festivalId') {
        return festivalMap.get(value) || <span className="text-slate-400 italic">Unknown Festival</span>;
    }
    return value;
};

const formatFieldName = (field: string) => {
    const map: Record<string, string> = {
        title: 'Title',
        description: 'Description',
        status: 'Status',
        dueDate: 'Due Date',
        assigneeName: 'Assignee',
        festivalId: 'Festival'
    };
    return map[field] || field;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ isOpen, onClose, taskTitle, history, isLoading, festivalMap }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl m-4 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Task History</h2>
                        <p className="text-slate-600 truncate" title={taskTitle}>{taskTitle}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-slate-500">Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-full text-center text-slate-500 py-10">
                            <HistoryIcon className="w-12 h-12 mb-4 text-slate-400"/>
                            <p className="font-semibold">No History Found</p>
                            <p className="text-sm">This task has not been modified since its creation.</p>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {history.map((item) => (
                                <li key={item.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <p className="font-semibold text-slate-700">
                                            Field Changed: <span className="font-bold text-blue-600">{formatFieldName(item.fieldChanged)}</span>
                                        </p>
                                        <p className="text-slate-500">{new Date(item.changedAt).toLocaleString()}</p>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <p><strong className="text-slate-500 w-16 inline-block">From:</strong> {formatFieldValue(item.fieldChanged, item.oldValue, festivalMap)}</p>
                                        <p><strong className="text-slate-500 w-16 inline-block">To:</strong> {formatFieldValue(item.fieldChanged, item.newValue, festivalMap)}</p>
                                        <p><strong className="text-slate-500 w-16 inline-block">By:</strong> {item.changedByUser}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end pt-6 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Close</button>
                </div>
            </div>
        </div>
    );
};