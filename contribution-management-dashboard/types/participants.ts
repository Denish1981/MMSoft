export interface EventRegistration {
  id: number;
  eventId: number;
  name: string;
  email?: string;
  formData: Record<string, any>;
  submittedAt: string; // ISO String
  paymentProofImage?: string;
  isGroupRegistration?: boolean;
  groupName?: string;
  groupMembers?: Array<{
    name: string;
    phone?: string;
    email?: string;
    age?: string | number;
    role?: string;
  }>;
}

export interface StallRegistrationProduct {
    productName: string;
    price: number;
}

export interface StallRegistration {
    id: number;
    userId?: number | null;
    email?: string;
    towerNumber?: string;
    flatNumber?: string;
    festivalId: number;
    registrantName: string;
    contactNumber: string;
    stallDates: string[]; // ISO String array
    products: StallRegistrationProduct[];
    needsElectricity: boolean;
    numberOfTables: number;
    totalPayment: number;
    paymentScreenshot: string;
    submittedAt: string; // ISO String
    status: 'Pending' | 'Approved' | 'Rejected';
    rejectionReason?: string;
    reviewedAt?: string; // ISO String
    reviewedBy?: string;
}

export interface ParticipantEventDetail {
  eventName: string;
  eventDate?: string;
}

export interface UniqueParticipant {
  name: string;
  email?: string;
  phoneNumber?: string;
  towerNumber?: string;
  flatNumber?: string;
  registrationCount: number;
  events?: string[];
  eventDetails?: ParticipantEventDetail[];
  lastRegisteredAt: string; // ISO String
}

export interface ParticipantDetails {
    eventName: string;
    eventDate: string; // ISO String
    submittedAt: string; // ISO String
}

export interface ParticipantRegistrationHistory {
    participant: {
        name: string;
        email?: string;
        phoneNumber?: string;
        towerNumber?: string;
        flatNumber?: string;
    };
    registrations: ParticipantDetails[];
}