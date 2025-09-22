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
  id?: number;
  amount: number;
  paymentDate: string; // ISO String
  paymentMethod: PaymentMethod;
  notes?: string;
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
  totalCost: number;
  billDate: string; // ISO String
  expenseHead: string;
  billReceipts?: string[];
  expenseBy: string;
  festivalId?: number | null;
  hasMultiplePayments: boolean;
  payments: Payment[];
  amountPaid: number;
  outstandingAmount: number;
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
