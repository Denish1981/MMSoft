import React from 'react';
import { CameraIcon } from '../icons/CameraIcon';
import { CloseIcon } from '../icons/CloseIcon';

interface EventBasicDetailsSectionProps {
    name: string;
    setName: (val: string) => void;
    eventDate: string;
    setEventDate: (val: string) => void;
    startTime: string;
    setStartTime: (val: string) => void;
    endTime: string;
    setEndTime: (val: string) => void;
    registrationDeadline: string;
    setRegistrationDeadline: (val: string) => void;
    venue: string;
    setVenue: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    rules: string;
    setRules: (val: string) => void;
    imagePreview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenCamera: () => void;
    onClearImage: () => void;
    isGroupEvent?: boolean;
    setIsGroupEvent?: (val: boolean) => void;
    minGroupSize?: number;
    setMinGroupSize?: (val: number) => void;
    maxGroupSize?: number;
    setMaxGroupSize?: (val: number) => void;
    allowDuplicateMembers?: boolean;
    setAllowDuplicateMembers?: (val: boolean) => void;
}

export const EventBasicDetailsSection: React.FC<EventBasicDetailsSectionProps> = ({
    name,
    setName,
    eventDate,
    setEventDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    registrationDeadline,
    setRegistrationDeadline,
    venue,
    setVenue,
    description,
    setDescription,
    rules,
    setRules,
    imagePreview,
    onFileChange,
    onOpenCamera,
    onClearImage,
    isGroupEvent = false,
    setIsGroupEvent,
    minGroupSize = 1,
    setMinGroupSize,
    maxGroupSize = 20,
    setMaxGroupSize,
    allowDuplicateMembers = false,
    setAllowDuplicateMembers,
}) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-slate-700">Event Name</label>
                    <input type="text" id="eventName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full input-style" required />
                </div>
                <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-slate-700">Event Date</label>
                    <input type="date" id="eventDate" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1 block w-full input-style" required />
                </div>
            </div>

            {/* Group Event Configuration & Member Deduplication */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-indigo-950 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isGroupEvent}
                                onChange={e => setIsGroupEvent && setIsGroupEvent(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>Is this a Group / Team Event? (e.g. Group Dance, Drama, Band, Sports)</span>
                        </label>
                        <p className="text-xs text-indigo-700/80 ml-6 mt-0.5">
                            Allows team captains to register team names and add member rosters with automatic duplicate prevention.
                        </p>
                    </div>
                </div>

                {isGroupEvent && (
                    <div className="ml-6 space-y-3 pt-2 border-t border-indigo-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Minimum Group Size</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={maxGroupSize || 50}
                                    value={minGroupSize}
                                    onChange={e => setMinGroupSize && setMinGroupSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="mt-1 block w-full input-style text-xs"
                                />
                                <span className="text-[11px] text-slate-500">Minimum participants required</span>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Maximum Group Size</label>
                                <input
                                    type="number"
                                    min={minGroupSize || 1}
                                    max={100}
                                    value={maxGroupSize}
                                    onChange={e => setMaxGroupSize && setMaxGroupSize(Math.max(minGroupSize || 1, parseInt(e.target.value, 10) || 20))}
                                    className="mt-1 block w-full input-style text-xs"
                                />
                                <span className="text-[11px] text-slate-500">Maximum participants allowed</span>
                            </div>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!allowDuplicateMembers}
                                    onChange={e => setAllowDuplicateMembers && setAllowDuplicateMembers(!e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span>🛡️ Member Deduplication: Prevent members from being registered in multiple teams for this event</span>
                            </label>
                            <p className="text-[11px] text-slate-500 ml-6">
                                When active, the system automatically checks participant names & mobile numbers across all team submissions to reject duplicate entries.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">Start Time</label>
                    <input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full input-style" required />
                </div>
                <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-slate-700">End Time (Optional)</label>
                    <input type="time" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full input-style" />
                </div>
            </div>
            <div>
                <label htmlFor="registrationDeadline" className="block text-sm font-medium text-slate-700">
                    Last Date for Registration (Optional)
                </label>
                <div className="mt-1 flex items-center space-x-2">
                    <input 
                        type="date" 
                        id="registrationDeadline" 
                        value={registrationDeadline} 
                        onChange={e => setRegistrationDeadline(e.target.value)} 
                        max={eventDate || undefined}
                        className="block w-full input-style" 
                    />
                    {registrationDeadline && (
                        <button
                            type="button"
                            onClick={() => setRegistrationDeadline('')}
                            className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-300 whitespace-nowrap"
                        >
                            Clear Cutoff
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Beyond this date (11:59 PM), no user will be able to register. If not set, registration remains open until the event date.
                </p>
            </div>
            <div>
                <label htmlFor="venue" className="block text-sm font-medium text-slate-700">Venue</label>
                <input type="text" id="venue" value={venue} onChange={e => setVenue(e.target.value)} className="mt-1 block w-full input-style" required />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Event Overview & Description (Optional)</label>
                <textarea 
                    id="description" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    rows={3} 
                    placeholder="Brief overview of the celebration, theme, who can join..."
                    className="mt-1 block w-full input-style" 
                />
            </div>
            <div>
                <div className="flex items-center justify-between">
                    <label htmlFor="rules" className="block text-sm font-medium text-slate-700">
                        Event Rules & Guidelines (Optional)
                    </label>
                    <span className="text-xs text-slate-400">Shown in rules modal & guidelines page</span>
                </div>
                <textarea 
                    id="rules" 
                    value={rules} 
                    onChange={e => setRules(e.target.value)} 
                    rows={4} 
                    placeholder="Enter each rule on a new line or bullet point:&#10;• Maximum 4 minutes per dance performance&#10;• Audio track must be submitted 48 hours prior&#10;• Report to backstage 30 mins before stage time"
                    className="mt-1 block w-full input-style font-mono text-xs" 
                />
                <p className="text-xs text-slate-500 mt-1">
                    Tip: Separate each rule by a new line. They will be formatted cleanly into itemized checklists for participants.
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Event Image (Optional)</label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                    <label htmlFor="imageUpload" className="w-full text-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                        Upload File
                        <input id="imageUpload" type="file" accept="image/*" onChange={onFileChange} className="sr-only" />
                    </label>
                    <button type="button" onClick={onOpenCamera} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                        <CameraIcon className="w-5 h-5 mr-2" /> Capture Image
                    </button>
                </div>
                {imagePreview && (
                    <div className="mt-4">
                        <div className="relative w-fit">
                            <img src={imagePreview} alt="Event preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                            <button type="button" onClick={onClearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
