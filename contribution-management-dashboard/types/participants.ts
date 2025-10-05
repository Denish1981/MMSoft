export interface EventRegistration {
  id: number;
  eventId: number;
  name: string;
  email?: string;
  formData: Record<string, any>;
  submittedAt: string; // ISO String
  paymentProofImage?: string;
}

export interface StallRegistrationProduct {
    productName: string;
    price: number;
}

export interface StallRegistration {
    id: number;
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

export interface UniqueParticipant {
  name: string;
  email?: string;
  phoneNumber?: string;
  registrationCount: number;
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
    };
    registrations: ParticipantDetails[];
}