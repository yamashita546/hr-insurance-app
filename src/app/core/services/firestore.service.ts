import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  Timestamp,
  query,
  collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export type Company = {
  companyId: string;
  name: string;
  industry?: string;
  address?: string;
  contactEmail?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
};

export type User = {
  uid: string;
  email: string;
  displayName?: string;
  companyId: string;
  role: 'system_admin' | 'company_admin' | 'hr_staff' | 'employee';
  invitedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
};

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  async addCompany(company: Omit<Company, 'companyId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const companyId = doc(collection(this.firestore, 'companies')).id;
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'companies', companyId), {
      ...company,
      companyId,
      createdAt: now,
      updatedAt: now,
      isActive: true
    });
    return companyId;
  }

  async addUser(user: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>, uid: string) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'users', uid), {
      ...user,
      uid,
      createdAt: now,
      updatedAt: now
    });
  }

  getCompanies(): Observable<Company[]> {
    const ref = collection(this.firestore, 'companies');
    const q = query(ref);
    return collectionData(q, { idField: 'companyId' }) as Observable<Company[]>;
  }
}
