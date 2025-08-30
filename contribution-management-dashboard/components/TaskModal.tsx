
import React, { useState, useEffect } from 'react';
import type { Task, Festival, UserForManagement } from '../types';
import { TaskStatus } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface TaskModalProps {
    taskToEdit: Task | null;
    festivals: Festival[];
    users: UserForManagement[];
    onClose: () => void;
    onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ taskToEdit, festivals, users, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<TaskStatus>(TaskStatus.ToDo);
    const [dueDate, setDueDate] = useState('');
    const [festivalId, setFestivalId] = useState<string | null>(null);
    const [assigneeName, setAssigneeName] = useState('');
    
    const isEditing = !!taskToEdit;

    useEffect(() => {
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setStatus(taskToEdit.status);
            setDueDate(new Date(taskToEdit.dueDate).toISOString().split('T')[0]);
            setFestivalId(taskToEdit.festivalId ? String(taskToEdit.festivalId) : null);
            setAssigneeName(taskToEdit.assigneeName);
        }
    }, [taskToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !status || !dueDate || !assigneeName) {
            alert('Please fill out all required fields: Title, Status, Due Date, and Assignee.');
            return;
        }
        onSubmit({ 
            title, 
            description, 
            status, 
            dueDate: new Date(dueDate + 'T00:00:00.000Z').toISOString(), 
            festivalId: festivalId ? Number(festivalId) : null, 
            assigneeName 
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4 overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description (Optional)</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm" required>
                                {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                           <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">Due Date</label>
                           <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="assigneeName" className="block text-sm font-medium text-slate-700">Assignee</label>
                            <select id="assigneeName" value={assigneeName} onChange={e => setAssigneeName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm" required>
                                <option value="" disabled>Select an assignee</option>
                                {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="festivalId" className="block text-sm font-medium text-slate-700">Associated Festival (Optional)</label>
                            <select id="festivalId" value={festivalId || ''} onChange={e => setFestivalId(e.target.value || null)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm">
                                <option value="">None</option>
                                {festivals.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Task' : 'Add Task'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
