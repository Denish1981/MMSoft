
import React, { useState, useMemo } from 'react';
import type { Task, Festival, UserForManagement } from '../../types';
import { TaskStatus } from '../../types';
import ReportContainer from './ReportContainer';
import { TextInput, DateInput, SelectInput, FilterContainer } from './FilterControls';
import { exportToCsv } from '../../utils/exportUtils';
import { HistoryIcon } from '../../components/icons/HistoryIcon';
import { formatUTCDate } from '../../utils/formatting';

interface TaskReportProps {
    tasks: Task[];
    festivals: Festival[];
    users: UserForManagement[];
    onViewHistory: (recordType: string, recordId: number, title: string) => void;
}

interface TaskFilters {
    title: string;
    status: string;
    assigneeName: string;
    festivalId: string;
    dueDate: string;
}

const TaskReport: React.FC<TaskReportProps> = ({ tasks, festivals, users, onViewHistory }) => {
    const [filters, setFilters] = useState<TaskFilters>({
        title: '',
        status: '',
        assigneeName: '',
        festivalId: '',
        dueDate: '',
    });

    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);
    const festivalOptions = useMemo(() => festivals.map(f => ({ value: f.id.toString(), label: f.name })), [festivals]);
    
    const userOptions = useMemo(() => {
        const userList = new Set(users.map(u => u.username));
        tasks.forEach(task => userList.add(task.assigneeName));
        return Array.from(userList)
            .sort()
            .map(username => ({ value: username, label: username }));
    }, [users, tasks]);

    const statusOptions = useMemo(() => Object.values(TaskStatus).map(s => ({ value: s, label: s })), []);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            title: '',
            status: '',
            assigneeName: '',
            festivalId: '',
            dueDate: '',
        });
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filters.title && !task.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
            if (filters.status && task.status !== filters.status) return false;
            if (filters.assigneeName && task.assigneeName !== filters.assigneeName) return false;
            if (filters.festivalId && (task.festivalId === null || task.festivalId.toString() !== filters.festivalId)) return false;

            if (filters.dueDate) {
                const taskDate = new Date(task.dueDate).setHours(0, 0, 0, 0);
                const filterDate = new Date(filters.dueDate).setHours(0, 0, 0, 0);
                if (taskDate !== filterDate) return false;
            }

            return true;
        });
    }, [tasks, filters]);

    const handleExport = () => {
        const dataToExport = filteredTasks.map(task => ({
            'Task ID': task.id,
            'Title': task.title,
            'Description': task.description || '',
            'Status': task.status,
            'Due Date': new Date(task.dueDate).toLocaleDateString(),
            'Assignee': task.assigneeName,
            'Associated Festival': (task.festivalId && festivalMap.get(task.festivalId)) || 'N/A',
            'Created At': new Date(task.createdAt).toLocaleString(),
            'Last Updated': new Date(task.updatedAt).toLocaleString(),
        }));
        exportToCsv(dataToExport, 'task_report');
    };

    return (
        <ReportContainer title="Task Report" onExport={handleExport}>
            <FilterContainer onReset={resetFilters}>
                <TextInput label="Task Title" value={filters.title} onChange={val => handleFilterChange('title', val)} />
                <SelectInput label="Status" value={filters.status} onChange={val => handleFilterChange('status', val)} options={statusOptions} placeholder="All Statuses" />
                <SelectInput label="Assignee" value={filters.assigneeName} onChange={val => handleFilterChange('assigneeName', val)} options={userOptions} placeholder="All Assignees" />
                <SelectInput label="Festival" value={filters.festivalId} onChange={val => handleFilterChange('festivalId', val)} options={festivalOptions} placeholder="All Festivals" />
                <DateInput label="Due Date" value={filters.dueDate} onChange={val => handleFilterChange('dueDate', val)} />
            </FilterContainer>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Task</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assignee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Festival</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredTasks.map(task => (
                            <tr key={task.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">{task.title}</div>
                                    <div className="text-sm text-slate-500 truncate max-w-xs" title={task.description}>{task.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{task.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatUTCDate(task.dueDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{task.assigneeName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{(task.festivalId && festivalMap.get(task.festivalId)) || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={() => onViewHistory('tasks', task.id, `History for ${task.title}`)}
                                        className="text-slate-500 hover:text-blue-600 p-1 rounded-full transition-colors"
                                        title="View History"
                                    >
                                        <HistoryIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {filteredTasks.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-500">
                                    No tasks match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ReportContainer>
    );
};

export default TaskReport;
