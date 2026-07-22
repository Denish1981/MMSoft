import React, { useState, useEffect } from 'react';
// FIX: Split imports between react-router and react-router-dom to fix export resolution issues.
import { useParams } from 'react-router';
import type { Event, EventContactPerson, RegistrationFormField } from '../types/index';
import { formatDateForInput } from '../utils/formatting';
import { CloseIcon } from './icons/CloseIcon';
import CameraCapture from './CameraCapture';
import { EventBasicDetailsSection } from './event-modal/EventBasicDetailsSection';
import { EventRegistrationSchemaSection } from './event-modal/EventRegistrationSchemaSection';
import { EventContactPersonsSection } from './event-modal/EventContactPersonsSection';

interface EventModalProps {
    eventToEdit: Event | null;
    onClose: () => void;
    onSubmit: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'registrationCount'>) => void;
}

const defaultFormSchema: RegistrationFormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'phone_number', label: 'Phone Number', type: 'tel', required: true },
    { name: 'tower_number', label: 'Tower Number', type: 'text', required: true },
    { name: 'flat_number', label: 'Flat Number', type: 'text', required: true },
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
            const raw = eventToEdit as any;
            setName(raw.name || '');
            
            const rawDate = raw.eventDate ?? raw.event_date;
            setEventDate(formatDateForInput(rawDate));
            
            const rawStart = raw.startTime ?? raw.start_time ?? '';
            setStartTime(rawStart ? String(rawStart).substring(0, 5) : '');
            
            const rawEnd = raw.endTime ?? raw.end_time ?? '';
            setEndTime(rawEnd ? String(rawEnd).substring(0, 5) : '');
            
            setVenue(raw.venue || '');
            setDescription(raw.description || '');
            
            const rawImg = raw.image ?? raw.image_data ?? undefined;
            setImage(rawImg);
            setImagePreview(rawImg || null);
            
            const rawContacts = raw.contactPersons ?? raw.contact_persons ?? [];
            setContactPersons(Array.isArray(rawContacts) && rawContacts.length > 0 ? rawContacts : [{ name: '', contactNumber: '', email: '' }]);
            
            let rawSchema = raw.registrationFormSchema ?? raw.registration_form_schema;
            if (typeof rawSchema === 'string') {
                try {
                    rawSchema = JSON.parse(rawSchema);
                } catch {
                    rawSchema = defaultFormSchema;
                }
            }
            setFormSchema(Array.isArray(rawSchema) && rawSchema.length > 0 ? rawSchema : defaultFormSchema);
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
                    <EventBasicDetailsSection
                        name={name}
                        setName={setName}
                        eventDate={eventDate}
                        setEventDate={setEventDate}
                        startTime={startTime}
                        setStartTime={setStartTime}
                        endTime={endTime}
                        setEndTime={setEndTime}
                        venue={venue}
                        setVenue={setVenue}
                        description={description}
                        setDescription={setDescription}
                        imagePreview={imagePreview}
                        onFileChange={handleFileChange}
                        onOpenCamera={() => setIsCameraOpen(true)}
                        onClearImage={() => { setImage(undefined); setImagePreview(null); }}
                    />

                    <EventRegistrationSchemaSection
                        formSchema={formSchema}
                        onSchemaChange={handleSchemaChange}
                        onAddSchemaField={addSchemaField}
                        onRemoveSchemaField={removeSchemaField}
                    />

                    <EventContactPersonsSection
                        contactPersons={contactPersons}
                        onContactChange={handleContactChange}
                        onAddContactField={addContactField}
                        onRemoveContactField={removeContactField}
                    />

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
