import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  Timestamp,
  query,
  collectionData,
  addDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AppUser } from '../models/user.model';
import { Company } from '../models/company.model';
import { InsuranceRate } from '../models/insurance-rate.model';

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

  async inviteOwner(email: string, companyId: string, tempPassword: string) {
    const token = Math.random().toString(36).slice(2);
    await addDoc(collection(this.firestore, 'invites'), {
      email,
      companyId,
      tempPassword,
      token,
      role: 'owner',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24)), // 24時間有効
    });
    return token;
  }

  getCompanies(): Observable<Company[]> {
    const ref = collection(this.firestore, 'companies');
    const q = query(ref);
    return collectionData(q, { idField: 'companyId' }) as Observable<Company[]>;
  }

  // 健康保険料率マスタ追加
  async addInsuranceRate(rate: Omit<InsuranceRate, 'id' | 'updatedAt'>) {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(this.firestore, 'insuranceRates'), {
      ...rate,
      updatedAt: now
    });
    return docRef.id;
  }

  // 健康保険料率マスタ更新
  async updateInsuranceRate(id: string, rate: Partial<InsuranceRate>) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'insuranceRates', id), {
      ...rate,
      updatedAt: now
    }, { merge: true });
  }

  // 健康保険料率マスタ削除
  async deleteInsuranceRate(id: string) {
    await deleteDoc(doc(this.firestore, 'insuranceRates', id));
  }

  // 健康保険料率マスタ一覧取得
  getInsuranceRates(): Observable<InsuranceRate[]> {
    const ref = collection(this.firestore, 'insuranceRates');
    const q = query(ref);
    return collectionData(q, { idField: 'id' }) as Observable<InsuranceRate[]>;
  }
}
