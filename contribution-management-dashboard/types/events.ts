export interface Festival {
  id: number;
  name: string;
  description?: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  campaignId: number | null;
  stallRegistrationOpen?: boolean;
  stallStartDate?: string; // ISO String
  stallEndDate?: string; // ISO String
  stallPricePerTablePerDay?: number;
  stallElectricityCostPerDay?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export enum TaskStatus {
    ToDo = 'To Do',
    InProgress = 'In Progress',
    Done = 'Done',
    Blocked = 'Blocked',
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    status: TaskStatus;
    dueDate: string; // ISO String
    festivalId: number | null;
    assigneeName: string;
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
    deletedAt?: string | null;
}

export interface EventContactPerson {
  name: string;
  contactNumber: string;
  email?: string;
}

export type RegistrationFormFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';

export interface RegistrationFormField {
  name: string;
  label: string;
  type: RegistrationFormFieldType;
  required: boolean;
  options?: string;
}

export interface Event {
  id: number;
  festivalId: number;
  name: string;
  eventDate: string; // ISO String
  startTime: string; // e.g., "18:00"
  endTime: string | null; // e.g., "20:00"
  description?: string;
  image?: string;
  venue: string;
  contactPersons: EventContactPerson[];
  registrationCount?: number;
  registrationFormSchema?: RegistrationFormField[];
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  deletedAt?: string | null;
}
