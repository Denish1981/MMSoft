import type { PublicEvent } from '../RegistrationModal';

export interface EventParticipantEntry {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    [key: string]: any;
}

export interface RosterMember {
    id: string;
    name: string;
    phone?: string;
    email?: string;
}

export interface PrimaryContactData {
    fullName: string;
    contactNumber: string;
    email: string;
    towerNumber: string;
    flatNumber: string;
}
