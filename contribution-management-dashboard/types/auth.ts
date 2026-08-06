export interface Role {
    id: number;
    name: string;
    description?: string;
}

export interface RosterMemberItem {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
}

export interface AuthUser {
    id: number;
    email: string;
    username?: string;
    fullName?: string;
    mobileNumber?: string;
    towerNumber?: string;
    flatNumber?: string;
    familyRoster?: RosterMemberItem[];
    roles?: string[];
    permissions: string[];
}

export interface UserForManagement {
    id: number;
    username: string;
    createdAt: string;
    roles: Role[];
}
