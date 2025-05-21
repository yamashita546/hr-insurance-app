export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  companyId: string;
  role: 'admin' | 'owner' | 'leader' | 'operator';
  invitedBy?: string;
  createdAt: any; // FirestoreのTimestamp型
  updatedAt: any;
  lastLoginAt?: any;
}



