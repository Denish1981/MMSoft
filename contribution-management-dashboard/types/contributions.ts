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
  paymentReceivedBy: string;
  image?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
}
