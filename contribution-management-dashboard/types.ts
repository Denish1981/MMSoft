export enum ContributionStatus {
  Completed = 'Completed',
  Pending = 'Pending',
  Failed = 'Failed',
}

export type ContributionType = 'Online' | 'Cash';

export interface Campaign {
  id: string;
  name: string;
  goal: number;
  description:string;
}

export interface Contribution {
  id: string;
  donorName: string;
  donorEmail?: string;
  mobileNumber?: string;
  towerNumber: string;
  flatNumber: string;
  amount: number;
  numberOfCoupons: number;
  campaignId: string | null;
  date: string; // ISO string
  status: ContributionStatus;
  type: ContributionType | null;
  image?: string;
}

export interface Donor {
  id: string;
  email?: string;
  name: string;
  mobileNumber?: string;
  towerNumber: string;
  flatNumber: string;
  totalContributed: number;
  contributionCount: number;
}

export interface Sponsor {
  id: string;
  name: string;
  contactNumber: string;
  address: string;
  email?: string;
  businessCategory: string;
  businessInfo: string;
  sponsorshipAmount: number;
  sponsorshipType: string;
}

export interface ContactPerson {
  name: string;
  contactNumber: string;
}

export interface Vendor {
  id: string;
  name: string;
  business: string;
  address: string;
  contacts: ContactPerson[];
}

export interface Expense {
  id: string;
  name: string;
  vendorId: string;
  cost: number;
  billDate: string; // ISO String
  expenseHead: string;
  billReceipts?: string[];
  expenseBy: string;
}

export interface Quotation {
    id: string;
    quotationFor: string;
    vendorId: string;
    cost: number;
    date: string; // ISO String
    quotationImages: string[];
}

export interface Budget {
  id: string;
  itemName: string;
  budgetedAmount: number;
  expenseHead: string;
}
