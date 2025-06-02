import { Timestamp } from "@angular/fire/firestore";



// ユーザーモデル
export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  companyKey: string;
  role: 'admin' | 'owner' | 'leader' | 'operator';
  invitedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  isRegistered?: boolean;
}


