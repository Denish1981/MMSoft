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
