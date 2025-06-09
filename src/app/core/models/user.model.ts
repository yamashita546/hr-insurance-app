import { Timestamp } from "@angular/fire/firestore";



// ユーザーモデル
export interface AppUser {
  uid: string;
  userId: string;
  email: string;
  displayName?: string;
  companyKey: string;
  role: 'admin' | 'owner' | 'leader' | 'operator';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  isRegistered?: boolean;
  isGoogleLinked?: boolean;
  isActive?: boolean;
  initialPassword?: string;
}


