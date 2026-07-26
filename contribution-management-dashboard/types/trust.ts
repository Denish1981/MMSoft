export interface TrustMember {
  id?: number;
  name: string;
  designation: string;
  contactNumber: string;
  email?: string;
}

export interface TrustDetails {
  name: string;
  registrationNumber: string;
  registrationDate: string;
  address: string;
  contactNumber: string;
  email?: string;
  members: TrustMember[];
}
