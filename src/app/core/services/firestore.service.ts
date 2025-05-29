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
  deleteDoc,
  getDocs,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AppUser } from '../models/user.model';
import { Company, Office } from '../models/company.model';
import { InsuranceRate } from '../models/insurance-rate.model';
import { Employee } from '../models/employee.model';
import { Attendance } from '../models/attendance.model';
import { Salary } from '../models/salary.model';

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

  // 都道府県コード＋適用開始日をIDとした健康保険料率マスタ追加・上書き
  async addOrUpdateInsuranceRateById(id: string, rate: InsuranceRate) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'insuranceRates', id), {
      ...rate,
      updatedAt: now
    }, { merge: true });
  }

  // 標準報酬月額マスタ追加・上書き（id: gradeType_insuranceType_id）
  async addOrUpdateStandardMonthlyGradeById(id: string, grade: any) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'standardMonthlyGrades', id), {
      ...grade,
      updatedAt: now
    }, { merge: true });
  }

  // 標準報酬月額マスタ削除
  async deleteStandardMonthlyGrade(id: string) {
    await deleteDoc(doc(this.firestore, 'standardMonthlyGrades', id));
  }

  // 標準報酬月額マスタ一覧取得
  getStandardMonthlyGrades(): Observable<any[]> {
    const ref = collection(this.firestore, 'standardMonthlyGrades');
    const q = query(ref);
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  async updateCompany(company: any) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'companies', company.companyId), {
      ...company,
      updatedAt: now
    }, { merge: true });
  }

  // 支社（offices）一覧取得
  async getOffices(companyId: string): Promise<Office[]> {
    const officesCol = collection(this.firestore, `companies/${companyId}/offices`);
    const snap = await getDocs(officesCol);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
  }

  // 事業所（offices）追加（displayOfficeId自動生成）
  async addOffice(companyId: string, office: Omit<Office, 'id' | 'displayOfficeId'>, companyDisplayId: string): Promise<void> {
    const officesCol = collection(this.firestore, `companies/${companyId}/offices`);
    const snap = await getDocs(officesCol);
    // 既存のdisplayOfficeIdの最大値を取得
    const maxId = snap.docs
      .map(doc => doc.data()['displayOfficeId'])
      .map(id => parseInt((id || '').split('-').pop() || '0', 10))
      .reduce((max, curr) => Math.max(max, curr), 0);
    // 新しいdisplayOfficeIdを生成
    const newDisplayOfficeId = `${companyDisplayId}-${String(maxId + 1).padStart(2, '0')}`;
    // Firestoreに保存
    const docRef = await addDoc(officesCol, { ...office, displayOfficeId: newDisplayOfficeId });
    await setDoc(docRef, { id: docRef.id }, { merge: true });
  }

  // 事業所（offices）一括上書き
  async updateAllOffices(companyId: string, offices: Office[]): Promise<void> {
    const officesCol = collection(this.firestore, `companies/${companyId}/offices`);
    for (const office of offices) {
      // officesプロパティなど不要なものを除外
      const { offices, ...officeData } = office as any;
      await setDoc(doc(officesCol, office.id), officeData, { merge: true });
    }
  }

  async addEmployee(employee: Omit<Employee, 'employeeId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const employeeId = doc(collection(this.firestore, 'employees')).id;
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'employees', employeeId), {
      ...employee,
      employeeId,
      createdAt: now,
      updatedAt: now,
      isActive: true
    });
    return employeeId;
  }

  async updateEmployee(employeeId: string, employee: Partial<Employee>) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'employees', employeeId), {
      ...employee,
      updatedAt: now
    }, { merge: true });
  }

  async getEmployeesByCompanyId(companyId: string): Promise<Employee[]> {
    const employeesCol = collection(this.firestore, 'employees');
    const q = query(employeesCol, where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as Employee)}));
  }

  async addAttendance(attendance: Omit<Attendance, 'createdAt' | 'updatedAt'>) {
    const attendancesCol = collection(this.firestore, 'attendances');
    const now = Timestamp.now();
    await addDoc(attendancesCol, {
      ...attendance,
      createdAt: now,
      updatedAt: now
    });
  }

  // 給与（salary）保存
  async addSalary(salary: Omit<Salary, 'createdAt' | 'updatedAt'>) {
    const salariesCol = collection(this.firestore, 'salaries');
    const now = Timestamp.now();
    await addDoc(salariesCol, {
      ...salary,
      createdAt: now,
      updatedAt: now
    });
  }

  // 賞与（bonus）保存
  async addBonus(bonus: Omit<import('../models/salary.model').Bonus, 'createdAt' | 'updatedAt'>) {
    const bonusesCol = collection(this.firestore, 'bonuses');
    const now = Timestamp.now();
    await addDoc(bonusesCol, {
      ...bonus,
      createdAt: now,
      updatedAt: now
    });
  }

  // 会社IDでsalaries一覧取得
  async getSalariesByCompanyId(companyId: string): Promise<any[]> {
    const salariesCol = collection(this.firestore, 'salaries');
    const q = query(salariesCol, where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as any) }));
  }

  // 会社IDでbonuses一覧取得
  async getBonusesByCompanyId(companyId: string): Promise<any[]> {
    const bonusesCol = collection(this.firestore, 'bonuses');
    const q = query(bonusesCol, where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as any) }));
  }
}
