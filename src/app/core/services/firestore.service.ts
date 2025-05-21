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
import { AppUser } from '../models/user.model';
import { Company } from '../models/company.model';


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

  async addUser(user: Omit<AppUser, 'createdAt' | 'updatedAt'>, uid: string) {
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
