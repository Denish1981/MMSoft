import React from 'react';
import { CheckSquareIcon } from '../icons/CheckSquareIcon';
import { DocStepItem } from './DocStepItem';

export const TasksVolunteersSection: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CheckSquareIcon className="w-7 h-7 text-blue-600" />
                    Tasks & Volunteer Operations
                </h2>
                <p className="text-slate-500 mt-1">Assign volunteer tasks, delegate responsibilities, track deadlines, and monitor completion states.</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-1">Creating and Assigning a Task</h3>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Go to Tasks" desc='Click "Tasks" in the sidebar menu.' />
                    <DocStepItem num={2} title='Click "Add Task"' desc="Click the main blue action button on the top right." />
                    <DocStepItem num={3} title="Form input" desc={"Fill in task details: \n• Title (e.g. \"Draft Catering Contract\")\n• Linked Festival (e.g. \"Summer Gala\")\n• Volunteer / Admin assigned\n• Due Date \n• Priority (Low, Medium, High)\n• Status (Pending, In Progress, Completed)"} />
                    <DocStepItem num={4} title="Save" desc="Submit the form to add the task. The system automatically alerts assigned volunteers when they access their task hub." />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1 font-semibold">Track Unique Participants</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                    The system collects a master list of all <strong>Unique Participants</strong> across all registrations, public stalls, and event signups automatically. 
                    Go to the <strong>Participants</strong> tab to search any local resident via name or phone number, see all their previous contributions, view festivals they registered for, and click individual history logs.
                </p>
            </div>
        </div>
    );
};
