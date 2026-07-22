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
    venue: string;
    setVenue: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    imagePreview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenCamera: () => void;
    onClearImage: () => void;
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
    venue,
    setVenue,
    description,
    setDescription,
    imagePreview,
    onFileChange,
    onOpenCamera,
    onClearImage,
}) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-slate-700">Event Name</label>
                    <input type="text" id="eventName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full input-style" required />
                </div>
                <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-slate-700">Date</label>
                    <input type="date" id="eventDate" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1 block w-full input-style" required />
                </div>
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
                <label htmlFor="venue" className="block text-sm font-medium text-slate-700">Venue</label>
                <input type="text" id="venue" value={venue} onChange={e => setVenue(e.target.value)} className="mt-1 block w-full input-style" required />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description (Optional)</label>
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full input-style" />
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
