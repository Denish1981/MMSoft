import React, { useState, useMemo } from 'react';
import type { Task } from '../types/index';
import { TaskStatus } from '../types/index';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import { UserIcon } from '../components/icons/UserIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { useData } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';

const statusColors: { [key in TaskStatus]: { bg: string; text: string; border: string } } = {
    [TaskStatus.ToDo]: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    [TaskStatus.InProgress]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    [TaskStatus.Done]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    [TaskStatus.Blocked]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

const TaskCard: React.FC<{ task: Task; onEdit: (task: Task) => void; onDelete: (id: number, type: string) => void; onViewHistory: (recordType: string, recordId: number, title: string) => void; festivalName: string | undefined; }> = ({ task, onEdit, onDelete, onViewHistory, festivalName }) => {
    const dueDate = new Date(task.dueDate);
    const isOverdue = dueDate < new Date() && task.status !== TaskStatus.Done;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 space-y-3">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 pr-2">{task.title}</h4>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <button onClick={() => onViewHistory('tasks', task.id, `History for ${task.title}`)} className="text-slate-500 hover:text-blue-600" title="View History"><HistoryIcon className="w-4 h-4" /></button>
                    <button onClick={() => onEdit(task)} className="text-slate-500 hover:text-slate-800" title="Edit Task"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(task.id, 'tasks')} className="text-red-500 hover:text-red-700" title="Delete Task"><DeleteIcon className="w-4 h-4" /></button>
                </div>
            </div>
            {task.description && <p className="text-sm text-slate-600 break-words">{task.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 items-center pt-2 border-t border-slate-100">
                <span className={`flex items-center ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                    <ClockIcon className="w-3 h-3 mr-1.5" />
                    Due: {dueDate.toLocaleDateString()}
                </span>
                {task.assigneeName && (
                    <span className="flex items-center">
                        <UserIcon className="w-3 h-3 mr-1.5" />
                        {task.assigneeName}
                    </span>
                )}
            </div>
            {festivalName && <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{festivalName}</span>}
        </div>
    );
};

const TaskColumn: React.FC<{ status: TaskStatus; tasks: Task[]; onEdit: (task: Task) => void; onDelete: (id: number, type: string) => void; onViewHistory: (recordType: string, recordId: number, title: string) => void; festivalMap: Map<number, string> }> = ({ status, tasks, onEdit, onDelete, onViewHistory, festivalMap }) => {
    const colors = statusColors[status];
    return (
        <div className={`flex-1 min-w-[300px] md:min-w-[320px] ${colors.bg} rounded-lg p-3 md:p-4 flex flex-col`}>
            <h3 className={`font-semibold ${colors.text} mb-4 flex items-center flex-shrink-0`}>
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${colors.bg.replace('100', '400')}`}></span>
                {status}
                <span className="ml-2 text-sm font-normal text-slate-500">{tasks.length}</span>
            </h3>
            <div className="space-y-4 h-full overflow-y-auto pr-1">
                {tasks.length > 0 ? (
                    tasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onEdit={onEdit} 
                            onDelete={onDelete}
                            onViewHistory={onViewHistory}
                            festivalName={task.festivalId ? festivalMap.get(task.festivalId) : undefined}
                        />
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full border-2 border-dashed border-slate-300 rounded-lg">
                        <p className="text-center text-sm text-slate-500">No tasks here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const Tasks: React.FC = () => {
    const { tasks, festivals } = useData();
    const { openTaskModal, openConfirmationModal, openHistoryModal } = useModal();
    
    const [selectedFestivalId, setSelectedFestivalId] = useState<string>('all');
    const festivalMap = useMemo(() => new Map(festivals.map(f => [f.id, f.name])), [festivals]);

    const filteredTasks = useMemo(() => {
        if (selectedFestivalId === 'all') return tasks;
        return tasks.filter(task => task.festivalId !== null && task.festivalId.toString() === selectedFestivalId);
    }, [tasks, selectedFestivalId]);

    const tasksByStatus = useMemo(() => {
        const grouped: { [key in TaskStatus]: Task[] } = {
            [TaskStatus.ToDo]: [],
            [TaskStatus.InProgress]: [],
            [TaskStatus.Done]: [],
            [TaskStatus.Blocked]: [],
        };
        filteredTasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [filteredTasks]);

    const statuses: TaskStatus[] = [TaskStatus.ToDo, TaskStatus.InProgress, TaskStatus.Done, TaskStatus.Blocked];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="bg-white p-4 rounded-xl shadow-md flex-shrink-0">
                <label htmlFor="festival-filter" className="block text-sm font-medium text-slate-700">Filter by Festival</label>
                <select 
                    id="festival-filter"
                    value={selectedFestivalId} 
                    onChange={e => setSelectedFestivalId(e.target.value)}
                    className="mt-1 block w-full md:w-1/3 px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Festivals</option>
                    {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>
            
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                {statuses.map(status => (
                    <TaskColumn
                        key={status}
                        status={status}
                        tasks={tasksByStatus[status]}
                        onEdit={openTaskModal}
                        onDelete={openConfirmationModal}
                        onViewHistory={openHistoryModal}
                        festivalMap={festivalMap}
                    />
                ))}
            </div>
        </div>
    );
};

export default Tasks;
