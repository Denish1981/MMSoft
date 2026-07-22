import React from 'react';
import { CalendarIcon } from '../icons/CalendarIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { StoreIcon } from '../icons/StoreIcon';
import { DocStepItem } from './DocStepItem';

export const FestivalsEventsSection: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-7 h-7 text-blue-600" />
                    Festivals & Events
                </h2>
                <p className="text-slate-500 mt-1">Configure community festivals, design sub-events, and review attendee ticket registrations.</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-1">1. Creating a New Festival</h3>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Navigate to Festivals" desc='Click on "Festivals" in the sidebar menu.' />
                    <DocStepItem num={2} title="Initiate creation" desc='Click the "Add Festival" button in the top right corner of the Header.' />
                    <DocStepItem num={3} title="Form entries" desc={"Fill in: \n• Festival name\n• Linked Campaign (select from dropdown)\n• Start Date and End Date\n• Festival descriptions and notes"} />
                    <DocStepItem num={4} title="Save" desc="Click the save button. The festival will be stored and become visible in your list." />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">2. Adding Events to a Festival</h3>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-xs font-semibold mb-2">
                    Note: Events must be linked to a parent Festival. Be sure to follow these exact steps to open the event-creation frame.
                </div>
                <div className="divide-y divide-slate-100">
                    <DocStepItem num={1} title="Locate parent Festival" desc='Navigate to the "Festivals" page.' />
                    <DocStepItem 
                        num={2} 
                        title='Click "Manage Events" Icon' 
                        desc={(
                            <span>
                                In the festivals list table, find your desired festival. Now under the <strong>Actions</strong> column, click the <CalendarDaysIcon className="w-4 h-4 inline mx-1 text-blue-600" /> icon (Calendar Days) associated with that festival.
                            </span>
                        )} 
                    />
                    <DocStepItem num={3} title="Add Event" desc='On the Festival Events page that loads, click the "Add Event" button appearing in the header.' />
                    <DocStepItem num={4} title="Enter Event details" desc="Input Name, Event Date, Start & End times, Venue, Description / Ticket Price (if applicable), and description." />
                    <DocStepItem num={5} title="Save Event" desc="Save details. The sub-event is instantly linked and displayed in the event calendar." />
                </div>

                <h3 className="text-lg font-bold text-slate-800 pt-4 border-b pb-1">3. Managing Public Stall Registrations</h3>
                <p className="text-slate-600 text-sm">Festivals can offer public stall rentals. Users register via a public page, and admins review them.</p>
                <div className="divide-y divide-slate-100">
                    <DocStepItem 
                        num={1} 
                        title='Click "Manage Stalls"' 
                        desc={(
                            <span>
                                Go to <strong>Festivals</strong> page, locate your festival and click on the <StoreIcon className="w-4 h-4 inline mx-1 text-green-600" /> icon (Store/Shop Icon) to view and approve stall applications.
                            </span>
                        )} 
                    />
                    <DocStepItem num={2} title="Review applications" desc="Confirm payment details, authorize placement spot, or mark registrations as Completed/Pending." />
                </div>
            </div>
        </div>
    );
};
