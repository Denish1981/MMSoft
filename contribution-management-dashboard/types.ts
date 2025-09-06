export enum ContributionStatus {
  Completed = 'Completed',
  Pending = 'Pending',
  Failed = 'Failed',
}

export type ContributionType = 'Online' | 'Cash';

export interface Campaign {
  id: number;
  name: string;
  goal: number;
  description:string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export interface Contribution {
  id: number;
  donorName: string;
  donorEmail?: string;
  mobileNumber?: string;
  towerNumber: string;
  flatNumber: string;
  amount: number;
  numberOfCoupons: number;
  campaignId: number | null;
  date: string; // ISO string
  status: ContributionStatus;
  type: ContributionType | null;
  image?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export interface Donor {
  id: string; // This is a client-side generated composite ID, so it remains a string
  email?: string;
  name: string;
  mobileNumber?: string;
  towerNumber: string;
  flatNumber: string;
  totalContributed: number;
  contributionCount: number;
}

export interface Sponsor {
  id: number;
  name: string;
  contactNumber: string;
  address: string;
  email?: string;
  businessCategory: string;
  businessInfo: string;
  sponsorshipAmount: number;
  sponsorshipType: string;
  datePaid: string; // ISO string
  image?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export interface ContactPerson {
  name: string;
  contactNumber: string;
}

export interface Vendor {
  id: number;
  name: string;
  business: string;
  address: string;
  contacts: ContactPerson[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export type PaymentMethod = 'Cash' | 'Online' | 'Cheque';

export interface Payment {
  // FIX: Made backend-generated fields optional to allow creation on the client.
  id?: number;
  amount: number;
  paymentDate: string; // ISO String
  paymentMethod: PaymentMethod;
  notes?: string;
  paymentDoneBy?: string;
  image?: string;
  expenseId?: number;
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
  deletedAt?: string | null;
}

export interface Expense {
  id: number;
  name: string;
  vendorId: number;
  totalCost: number; // Renamed from cost
  billDate: string; // ISO String
  expenseHead: string;
  billReceipts?: string[];
  expenseBy: string;
  festivalId?: number | null;
  payments: Payment[]; // Added payments array
  // FIX: Made backend-calculated fields optional.
  amountPaid?: number; // Calculated on backend
  outstandingAmount?: number; // Calculated on backend
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}


export interface Quotation {
    id: number;
    quotationFor: string;
    vendorId: number;
    cost: number;
    date: string; // ISO String
    quotationImages: string[];
    festivalId?: number | null;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    deletedAt?: string | null;
}

export interface Budget {
  id: number;
  itemName: string;
  budgetedAmount: number;
  expenseHead: string;
  festivalId?: number | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}

export interface Festival {
  id: number;
  name: string;
  description?: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  campaignId: number | null;
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
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  deletedAt?: string | null;
}

export interface HistoryItem {
  id: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedByUser: string;
  changedAt: string; // ISO String
}


// --- NEW RBAC TYPES ---

export interface Role {
    id: number;
    name: string;
    description?: string;
}

export interface AuthUser {
    id: number;
    email: string;
    permissions: string[];
}

export interface UserForManagement {
    id: number;
    username: string;
    createdAt: string;
    roles: Role[];
}

export interface ArchivedItem {
    id: number;
    name: string;
    type: string;
    deletedAt: string;
}