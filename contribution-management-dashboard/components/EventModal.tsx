import React, { useState, useEffect } from 'react';
// FIX: Split imports between react-router and react-router-dom to fix export resolution issues.
import { useParams } from 'react-router';
import type { Event, EventContactPerson, RegistrationFormField, RegistrationFormFieldType } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CameraIcon } from './icons/CameraIcon';
import CameraCapture from './CameraCapture';
import { DeleteIcon } from './icons/DeleteIcon';

interface EventModalProps {
    eventToEdit: Event | null;
    onClose: () => void;
    onSubmit: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'registrationCount'>) => void;
}

const defaultFormSchema: RegistrationFormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'phone_number', label: 'Phone Number', type: 'tel', required: true },
];

const labelToName = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

export const EventModal: React.FC<EventModalProps> = ({ eventToEdit, onClose, onSubmit }) => {
    const { id: festivalId } = useParams<{ id: string }>();
    const isEditing = !!eventToEdit;

    const [name, setName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [venue, setVenue] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<string | undefined>();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [contactPersons, setContactPersons] = useState<EventContactPerson[]>([{ name: '', contactNumber: '', email: '' }]);
    const [formSchema, setFormSchema] = useState<RegistrationFormField[]>(defaultFormSchema);
    
    useEffect(() => {
        if (eventToEdit) {
            setName(eventToEdit.name);
            setEventDate(new Date(eventToEdit.eventDate).toISOString().split('T')[0]);
            setStartTime(eventToEdit.startTime || '');
            setEndTime(eventToEdit.endTime || '');
            setVenue(eventToEdit.venue);
            setDescription(eventToEdit.description || '');
            setImage(eventToEdit.image);
            setImagePreview(eventToEdit.image || null);
            setContactPersons(eventToEdit.contactPersons.length > 0 ? eventToEdit.contactPersons : [{ name: '', contactNumber: '', email: '' }]);
            setFormSchema(eventToEdit.registrationFormSchema && eventToEdit.registrationFormSchema.length > 0 ? eventToEdit.registrationFormSchema : defaultFormSchema);
        } else {
            // Reset form for new entry
            setName('');
            setEventDate('');
            setStartTime('');
            setEndTime('');
            setVenue('');
            setDescription('');
            setImage(undefined);
            setImagePreview(null);
            setContactPersons([{ name: '', contactNumber: '', email: '' }]);
            setFormSchema(defaultFormSchema);
        }
    }, [eventToEdit]);

    const handleContactChange = (index: number, field: keyof EventContactPerson, value: string) => {
        const newContacts = [...contactPersons];
        (newContacts[index] as any)[field] = value;
        setContactPersons(newContacts);
    };

    const addContactField = () => {
        setContactPersons([...contactPersons, { name: '', contactNumber: '', email: '' }]);
    };

    const removeContactField = (index: number) => {
        if (contactPersons.length > 1) {
            setContactPersons(contactPersons.filter((_, i) => i !== index));
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImage(base64String);
                setImagePreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCaptureComplete = (imageDataUrl: string) => {
        setImage(imageDataUrl);
        setImagePreview(imageDataUrl);
        setIsCameraOpen(false);
    };

    const handleSchemaChange = (index: number, field: keyof RegistrationFormField, value: any) => {
        const newSchema = [...formSchema];
        const currentField = { ...newSchema[index], [field]: value };

        if(field === 'label') {
            currentField.name = labelToName(value);
        }

        newSchema[index] = currentField;
        setFormSchema(newSchema);
    };

    const addSchemaField = () => {
        setFormSchema([...formSchema, { name: `custom_field_${Date.now()}`, label: '', type: 'text', required: false, options: '' }]);
    };

    const removeSchemaField = (index: number) => {
        setFormSchema(formSchema.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !eventDate || !venue || !festivalId || !startTime) {
            alert('Please fill out all required fields: Name, Date, Venue and Start Time.');
            return;
        }
        const submissionData = {
            festivalId: Number(festivalId),
            name, 
            eventDate: eventDate,
            startTime, 
            endTime: endTime || null, 
            venue, 
            description, 
            image,
            contactPersons: contactPersons.filter(c => c.name && c.contactNumber), // Filter out empty contacts
            registrationFormSchema: formSchema,
        };
        onSubmit(submissionData);
    };
    

    return (
        <>
        {isCameraOpen && <CameraCapture onCapture={handleCaptureComplete} onClose={() => setIsCameraOpen(false)} />}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl m-4 overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Event' : 'Add New Event'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Event Details */}
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
                                <input id="imageUpload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                            </label>
                            <button type="button" onClick={() => setIsCameraOpen(true)} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700">
                                <CameraIcon className="w-5 h-5 mr-2" /> Capture Image
                            </button>
                        </div>
                        {imagePreview && (
                            <div className="mt-4"><div className="relative w-fit">
                                <img src={imagePreview} alt="Event preview" className="max-h-40 rounded-md border border-slate-200 p-1" />
                                <button type="button" onClick={() => { setImage(undefined); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div></div>
                        )}
                    </div>

                    {/* Registration Form Builder */}
                    <div className="pt-4 mt-4 border-t border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Custom Registration Form</h3>
                        <div className="space-y-4">
                            {formSchema.map((field, index) => {
                                const isDefault = index < 2;
                                return (
                                <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50 relative">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">Field Label</label>
                                            <input type="text" value={field.label} onChange={e => handleSchemaChange(index, 'label', e.target.value)} className="mt-1 block w-full input-style text-sm" disabled={isDefault} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600">Field Type</label>
                                            <select value={field.type} onChange={e => handleSchemaChange(index, 'type', e.target.value)} className="mt-1 block w-full input-style text-sm bg-white" disabled={isDefault}>
                                                <option value="text">Text</option>
                                                <option value="email">Email</option>
                                                <option value="tel">Phone</option>
                                                <option value="textarea">Text Area</option>
                                                <option value="select">Dropdown</option>
                                                <option value="checkbox">Checkbox</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center space-x-2">
                                                <input type="checkbox" checked={field.required} onChange={e => handleSchemaChange(index, 'required', e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded" disabled={isDefault} />
                                                <span className="text-sm font-medium text-slate-700">Required</span>
                                            </label>
                                        </div>
                                    </div>
                                    {field.type === 'select' && (
                                        <div className="mt-4">
                                             <label className="block text-xs font-medium text-slate-600">Dropdown Options</label>
                                             <input type="text" value={field.options} onChange={e => handleSchemaChange(index, 'options', e.target.value)} placeholder="e.g., Small, Medium, Large" className="mt-1 block w-full input-style text-sm" />
                                             <p className="text-xs text-slate-500 mt-1">Enter comma-separated values.</p>
                                        </div>
                                    )}
                                    {!isDefault && (
                                        <button type="button" onClick={() => removeSchemaField(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><DeleteIcon className="w-5 h-5" /></button>
                                    )}
                                </div>
                            )})}
                        </div>
                        <button type="button" onClick={addSchemaField} className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                            <PlusIcon className="w-4 h-4 mr-1"/> Add Custom Field
                        </button>
                    </div>

                    <div className="space-y-4 pt-4 mt-4 border-t border-slate-200">
                        <h3 className="text-lg font-medium text-slate-800">Contact Persons</h3>
                        {contactPersons.map((contact, index) => (
                            <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 relative">
                                {contactPersons.length > 1 && (
                                    <button type="button" onClick={() => removeContactField(index)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor={`contactName-${index}`} className="block text-sm font-medium text-slate-600">Contact Name</label>
                                        <input type="text" id={`contactName-${index}`} value={contact.name} onChange={e => handleContactChange(index, 'name', e.target.value)} className="mt-1 block w-full input-style" />
                                    </div>
                                     <div>
                                        <label htmlFor={`contactNumber-${index}`} className="block text-sm font-medium text-slate-600">Contact Number</label>
                                        <input type="tel" id={`contactNumber-${index}`} value={contact.contactNumber} onChange={e => handleContactChange(index, 'contactNumber', e.target.value)} className="mt-1 block w-full input-style" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor={`contactEmail-${index}`} className="block text-sm font-medium text-slate-600">Email (Optional)</label>
                                    <input type="email" id={`contactEmail-${index}`} value={contact.email || ''} onChange={e => handleContactChange(index, 'email', e.target.value)} className="mt-1 block w-full input-style" />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addContactField} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                            <PlusIcon className="w-4 h-4 mr-1"/> Add another contact
                        </button>
                    </div>

                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{isEditing ? 'Update Event' : 'Add Event'}</button>
                    </div>
                </form>
                <style>{`.input-style { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input-style:focus { outline: none; box-shadow: 0 0 0 2px #3b82f6; border-color: #2563eb; }`}</style>
            </div>
        </div>
        </>
    );
};