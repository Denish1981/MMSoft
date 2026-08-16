
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

export type RegistrationFormFieldType = 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'file' | 'audio';

export interface RegistrationFormField {
  name: string;
  label: string;
  type: RegistrationFormFieldType;
  required: boolean;
  options?: string; // Comma-separated for select, or accepted file formats for file/audio (e.g. '.mp3,.wav,.m4a')
  helpText?: string; // Optional helper instructions shown beneath the field
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
  registrationDeadline?: string | null; // ISO string or YYYY-MM-DD
  registrationFormSchema: RegistrationFormField[];
  contactPersons: EventContactPerson[];
  registrationCount?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export function isEventRegistrationClosed(registrationDeadline?: string | null, eventDate?: string | null): boolean {
  const now = new Date();
  if (registrationDeadline) {
    const trimmed = String(registrationDeadline).trim();
    if (trimmed) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
        return now.getTime() > endOfDay.getTime();
      }
      const deadline = new Date(trimmed);
      if (!isNaN(deadline.getTime())) {
        return now.getTime() > deadline.getTime();
      }
    }
  }
  if (eventDate) {
    const trimmed = String(eventDate).trim();
    if (trimmed) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
        return now.getTime() > endOfDay.getTime();
      }
      const eDate = new Date(trimmed);
      if (!isNaN(eDate.getTime())) {
        return now.getTime() > eDate.getTime();
      }
    }
  }
  return false;
}

