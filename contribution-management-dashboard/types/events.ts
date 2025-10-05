
export interface Festival {
  id: number;
  name: string;
  description: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  campaignId: number | null;
  stallPricePerTablePerDay?: number | null;
  stallElectricityCostPerDay?: number | null;
  stallStartDate?: string | null; // ISO string
  stallEndDate?: string | null; // ISO string
  maxStalls?: number | null;
  stallDateCounts?: Record<string, number>;
  approvedStallCounts?: Record<string, number>;
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
  description: string | null;
  status: TaskStatus;
  dueDate: string; // ISO String
  festivalId: number | null;
  assigneeName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
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
  options?: string; // Comma-separated for select
}

export interface Event {
  id: number;
  festivalId: number;
  name: string;
  description: string | null;
  eventDate: string; // ISO String
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  venue: string;
  image?: string;
  registrationFormSchema: RegistrationFormField[];
  contactPersons: EventContactPerson[];
  registrationCount?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}
