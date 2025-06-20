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
  where,
  getDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AppUser } from '../models/user.model';
import { Company, Office } from '../models/company.model';
import { InsuranceRate } from '../models/insurance-rate.model';
import { Employee } from '../models/employee.model';
import { Attendance } from '../models/attendance.model';
import { Salary } from '../models/salary.model';
import { InsuranceSalaryCalculation, InsuranceBonusCalculation } from '../models/insurance-calculation.model';
import { EmployeeTransferHistory } from '../models/empoloyee.history';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  async addCompany(company: Omit<Company, 'companyKey' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const companyKey = doc(collection(this.firestore, 'companies')).id;
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'companies', companyKey), {
      ...company,
      companyKey,
      createdAt: now,
      updatedAt: now,
      isActive: true
    });
    return companyKey;
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

  async inviteOwner(email: string, companyKey: string, tempPassword: string) {
    const token = Math.random().toString(36).slice(2);
    await addDoc(collection(this.firestore, 'invites'), {
      email,
      companyKey,
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
    return collectionData(q, { idField: 'companyKey' }) as Observable<Company[]>;
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
    await setDoc(doc(this.firestore, 'companies', company.companyKey), {
      ...company,
      updatedAt: now
    }, { merge: true });
  }

  // 支社（offices）一覧取得
  async getOffices(companyKey: string): Promise<Office[]> {
    const officesCol = collection(this.firestore, `companies/${companyKey}/offices`);
    const snap = await getDocs(officesCol);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
  }

  // 事業所（offices）追加（displayOfficeId自動生成）
  async addOffice(companyKey: string, office: Omit<Office, 'id' | 'displayOfficeId'>, companyId: string): Promise<void> {
    const officesCol = collection(this.firestore, `companies/${companyKey}/offices`);
    const snap = await getDocs(officesCol);
    // 既存のdisplayOfficeIdの最大値を取得
    const maxId = snap.docs
      .map(doc => doc.data()['id'])
      .map(id => parseInt((id || '').split('-').pop() || '0', 10))
      .reduce((max, curr) => Math.max(max, curr), 0);
    // 新しいdisplayOfficeIdを生成
    const newOfficeId = `${companyId}-${String(maxId + 1).padStart(2, '0')}`;
    // Firestoreに保存
    const docRef = await addDoc(officesCol, { ...office, id: newOfficeId });
    await setDoc(docRef, { id: docRef.id }, { merge: true });
  }

  // 事業所（offices）一括上書き
  async updateAllOffices(companyKey: string, offices: Office[]): Promise<void> {
    const officesCol = collection(this.firestore, `companies/${companyKey}/offices`);
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

  async getEmployeesByCompanyKey(companyKey: string): Promise<Employee[]> {
    const employeesCol = collection(this.firestore, 'employees');
    const q = query(employeesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Employee)}));
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
  async getSalariesByCompanyKey(companyKey: string): Promise<any[]> {
    const salariesCol = collection(this.firestore, 'salaries');
    const q = query(salariesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as any) }));
  }

  // 会社IDでbonuses一覧取得
  async getBonusesByCompanyKey(companyKey: string): Promise<any[]> {
    const bonusesCol = collection(this.firestore, 'bonuses');
    const q = query(bonusesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as any) }));
  }

  // 給与（salary）更新（employeeId, targetYearMonthで検索して上書き）
  async updateSalary(companyKey: string, employeeId: string, targetYearMonth: string, salary: Omit<Salary, 'createdAt' | 'updatedAt'>) {
    const salariesCol = collection(this.firestore, 'salaries');
    const q = query(salariesCol, where('companyKey', '==', companyKey), where('employeeId', '==', employeeId), where('targetYearMonth', '==', targetYearMonth));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docRef = doc(this.firestore, 'salaries', snap.docs[0].id);
      await setDoc(docRef, { ...salary, updatedAt: Timestamp.now() }, { merge: true });
    }
  }

  // 賞与（bonus）更新（employeeId, targetYearMonthで検索して上書き）
    async updateBonus(companyKey: string, employeeId: string, targetYearMonth: string, bonus: Omit<import('../models/salary.model').Bonus, 'createdAt' | 'updatedAt'>) {
    const bonusesCol = collection(this.firestore, 'bonuses');
    const q = query(bonusesCol, where('companyKey', '==', companyKey), where('employeeId', '==', employeeId), where('targetYearMonth', '==', targetYearMonth));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docRef = doc(this.firestore, 'bonuses', snap.docs[0].id);
      await setDoc(docRef, { ...bonus, updatedAt: Timestamp.now() }, { merge: true });
    }
  }

  // 標準報酬月額決定データ保存
  async addStandardMonthlyDecision(decision: Omit<import('../models/standard-monthly-decision .model').StandardMonthlyDecision, 'createdAt' | 'updatedAt'>) {
    const now = Timestamp.now();
    const docId = `${decision.companyKey}_${decision.officeId}_${decision.employeeId}_${decision.applyYearMonth}`;
    const docRef = doc(this.firestore, 'standardMonthlyDecisions', docId);
    await setDoc(docRef, {
      ...decision,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  }

  // 会社IDで標準報酬月額決定データ一覧取得
  async getStandardMonthlyDecisionsByCompanyKey(companyKey: string): Promise<any[]> {
    const decisionsCol = collection(this.firestore, 'standardMonthlyDecisions');
    const q = query(decisionsCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as any) }));
  }

  // 給与計算結果保存
  async addInsuranceSalaryCalculation(calculation: Omit<InsuranceSalaryCalculation, 'createdAt' | 'updatedAt' | 'id'>) {
    if (!calculation.employeeId || !calculation.companyKey) return;
    const col = collection(this.firestore, 'insuranceSalaryCalculations');
    const now = Timestamp.now();
    const docRef = await addDoc(col, {
      ...calculation,
      createdAt: now,
      updatedAt: now
    });
    await setDoc(docRef, { id: docRef.id }, { merge: true });
  }

  // 賞与計算結果保存
  async addInsuranceBonusCalculation(calculation: Omit<InsuranceBonusCalculation, 'createdAt' | 'updatedAt' | 'id'>) {
    if (!calculation.employeeId || !calculation.companyKey) return;
    const now = Timestamp.now();
    const docId = `${calculation.companyKey}_${calculation.officeId}_${calculation.employeeId}_${calculation.applyYearMonth}`;
    const docRef = doc(this.firestore, 'insuranceBonusCalculations', docId);
    await setDoc(docRef, {
      ...calculation,
      createdAt: now,
      updatedAt: now,
      id: docId
    }, { merge: true });
  }

  // 給与計算結果一覧取得
  async getInsuranceSalaryCalculations(): Promise<InsuranceSalaryCalculation[]> {
    const colRef = collection(this.firestore, 'insuranceSalaryCalculations');
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ ...(doc.data() as InsuranceSalaryCalculation) }));
  }

  // 賞与計算結果一覧取得
  async getInsuranceBonusCalculations(): Promise<InsuranceBonusCalculation[]> {
    const colRef = collection(this.firestore, 'insuranceBonusCalculations');
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ ...(doc.data() as InsuranceBonusCalculation) }));
  }

  // 出勤データ一覧取得
  async getAttendancesByCompanyKey(companyKey: string): Promise<Attendance[]> {
    const attendancesCol = collection(this.firestore, 'attendances');
    const q = query(attendancesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as Attendance) }));
  }

  // --- 修正履歴 ---
  async addSalaryHistory(companyKey: string, employeeId: string, history: any) {
    const col = collection(this.firestore, `salaryHistory`);
    await addDoc(col, {
      companyKey,
      employeeId,
      ...history
    });
  }

  async addBonusHistory(companyKey: string, employeeId: string, history: any) {
    const col = collection(this.firestore, `bonusHistory`);
    await addDoc(col, {
      companyKey,
      employeeId,
      ...history
    });
  }

  async getSalaryHistory(companyKey: string, employeeId: string): Promise<any[]> {
    const colRef = collection(this.firestore, `salaryHistory`);
    const q_ = query(colRef, where('companyKey', '==', companyKey), where('employeeId', '==', employeeId));
    const snap = await getDocs(q_);
    return snap.docs.map(doc => doc.data());
  }

  async getBonusHistory(companyKey: string, employeeId: string): Promise<any[]> {
    const colRef = collection(this.firestore, `bonusHistory`);
    const q_ = query(colRef, where('companyKey', '==', companyKey), where('employeeId', '==', employeeId));
    const snap = await getDocs(q_);
    return snap.docs.map(doc => doc.data());
  }

  // 標準報酬月額決定の履歴保存
  async addStandardMonthlyDecisionHistory(history: any) {
    const col = collection(this.firestore, 'standardMonthlyDecisionHistory');
    await addDoc(col, history);
  }

  // 標準報酬月額決定の更新（履歴も保存）
  async updateStandardMonthlyDecisionWithHistory(decision: any, userId: string, userName: string) {
    // 履歴保存
    await this.addStandardMonthlyDecisionHistory({
      ...decision,
      operationType: 'edit',
      operationAt: new Date(),
      operatedByUserId: userId,
      operatedByUserName: userName
    });
    // 本体上書き
    const docId = `${decision.companyKey}_${decision.officeId}_${decision.employeeId}_${decision.applyYearMonth}`;
    const docRef = doc(this.firestore, 'standardMonthlyDecisions', docId);
    await setDoc(docRef, { ...decision, updatedAt: Timestamp.now() }, { merge: true });
  }

  // 標準報酬月額決定の論理削除（履歴も保存）
  async deleteStandardMonthlyDecisionWithHistory(decision: any, userId: string, userName: string) {
    // 履歴保存
    await this.addStandardMonthlyDecisionHistory({
      ...decision,
      operationType: 'delete',
      operationAt: new Date(),
      operatedByUserId: userId,
      operatedByUserName: userName
    });
    // 論理削除
    const docId = `${decision.companyKey}_${decision.officeId}_${decision.employeeId}_${decision.applyYearMonth}`;
    const docRef = doc(this.firestore, 'standardMonthlyDecisions', docId);
    await setDoc(docRef, { ...decision, isActive: false, updatedAt: Timestamp.now() }, { merge: true });
  }

  // IDで標準報酬月額決定データを取得
  async getStandardMonthlyDecisionById(decisionId: string): Promise<any> {
    const docRef = doc(this.firestore, 'standardMonthlyDecisions', decisionId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  // 履歴取得
  async getStandardMonthlyDecisionHistory(companyKey: string, employeeId: string, officeId: string): Promise<any[]> {
    const colRef = collection(this.firestore, 'standardMonthlyDecisionHistory');
    const q_ = query(
      colRef,
      where('companyKey', '==', companyKey),
      where('employeeId', '==', employeeId),
      where('officeId', '==', officeId)
    );
    const snap = await getDocs(q_);
    return snap.docs
      .map(doc => doc.data())
      .sort((a, b) => (b['applyYearMonth'] || '').localeCompare(a['applyYearMonth'] || ''));
  }

  // 指定会社・ロールのユーザー一覧取得（admin/owner/operator共通）
  async getUsersByCompanyKeyAndRole(companyKey: string, role: string): Promise<AppUser[]> {
    const usersCol = collection(this.firestore, 'users');
    const q = query(usersCol, where('companyKey', '==', companyKey), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as AppUser) }));
  }

  // 管理者ユーザー一覧取得
  async getAdminUsersByCompanyKey(companyKey: string): Promise<AppUser[]> {
    return this.getUsersByCompanyKeyAndRole(companyKey, 'admin');
  }

  // オーナーユーザー一覧取得
  async getOwnerUsersByCompanyKey(companyKey: string): Promise<AppUser[]> {
    return this.getUsersByCompanyKeyAndRole(companyKey, 'owner');
  }

  // オペレーターユーザー一覧取得
  async getOperatorUsersByCompanyKey(companyKey: string): Promise<AppUser[]> {
    return this.getUsersByCompanyKeyAndRole(companyKey, 'operator');
  }

  async deleteUser(uid: string) {
    await deleteDoc(doc(this.firestore, 'users', uid));
  }

  async updateUser(uid: string, data: Partial<AppUser>) {
    await setDoc(doc(this.firestore, 'users', uid), data, { merge: true });
  }

  // uidでAppUserを取得
  async getAppUserByUid(uid: string): Promise<AppUser | null> {
    const userDoc = doc(this.firestore, 'users', uid);
    const snap = await getDoc(userDoc);
    return snap.exists() ? (snap.data() as AppUser) : null;
  }

  // --- 従業員異動履歴 ---
  async addEmployeeTransferHistory(history: EmployeeTransferHistory) {
    const col = collection(this.firestore, 'employeeTransferHistory');
    await addDoc(col, history);
  }

  async getEmployeeTransferHistory(employeeId: string): Promise<EmployeeTransferHistory[]> {
    const colRef = collection(this.firestore, 'employeeTransferHistory');
    const q_ = query(colRef, where('employeeId', '==', employeeId));
    const snap = await getDocs(q_);
    return snap.docs.map(doc => doc.data() as EmployeeTransferHistory).sort((a, b) => (b.transferDate || '').localeCompare(a.transferDate || ''));
  }

  // 会社IDで給与計算結果一覧取得
  async getInsuranceSalaryCalculationsByCompanyKey(companyKey: string): Promise<InsuranceSalaryCalculation[]> {
    const colRef = collection(this.firestore, 'insuranceSalaryCalculations');
    const q = query(colRef, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as InsuranceSalaryCalculation) }));
  }

  // 会社IDで賞与計算結果一覧取得
  async getInsuranceBonusCalculationsByCompanyKey(companyKey: string): Promise<InsuranceBonusCalculation[]> {
    const colRef = collection(this.firestore, 'insuranceBonusCalculations');
    const q = query(colRef, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...(doc.data() as InsuranceBonusCalculation) }));
  }

  // 勤怠データ上書き保存
  async updateAttendance(attendanceId: string, attendance: Partial<Attendance>) {
    const now = Timestamp.now();
    await setDoc(doc(this.firestore, 'attendances', attendanceId), {
      ...attendance,
      updatedAt: now
    }, { merge: true });
  }

  // 賞与（bonus）削除（employeeId, targetYearMonth, paymentDateで特定して削除）
  async deleteBonus(companyKey: string, employeeId: string, targetYearMonth: string, paymentDate: string) {
    const bonusesCol = collection(this.firestore, 'bonuses');
    const q = query(bonusesCol, where('companyKey', '==', companyKey), where('employeeId', '==', employeeId), where('targetYearMonth', '==', targetYearMonth), where('paymentDate', '==', paymentDate));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(this.firestore, 'bonuses', docSnap.id));
    }
  }

  // 給与計算結果の上書き保存
  async updateInsuranceSalaryCalculation(calculation: Omit<InsuranceSalaryCalculation, 'createdAt' | 'updatedAt' | 'id'>) {
    if (!calculation.employeeId || !calculation.companyKey) return;
    const col = collection(this.firestore, 'insuranceSalaryCalculations');
    const q_ = query(col, 
      where('employeeId', '==', calculation.employeeId), 
      where('companyKey', '==', calculation.companyKey), 
      where('applyYearMonth', '==', calculation.applyYearMonth)
    );
    const snap = await getDocs(q_);
    if (!snap.empty) {
      const docRef = doc(this.firestore, 'insuranceSalaryCalculations', snap.docs[0].id);
      await setDoc(docRef, { ...calculation, updatedAt: Timestamp.now() }, { merge: true });
    }
  }

  // 賞与計算結果の上書き保存
  async updateInsuranceBonusCalculation(calculation: Omit<InsuranceBonusCalculation, 'createdAt' | 'updatedAt' | 'id'>) {
    if (!calculation.employeeId || !calculation.companyKey) return;
    const col = collection(this.firestore, 'insuranceBonusCalculations');
    const q_ = query(col, 
      where('employeeId', '==', calculation.employeeId), 
      where('companyKey', '==', calculation.companyKey), 
      where('applyYearMonth', '==', calculation.applyYearMonth)
    );
    const snap = await getDocs(q_);
    if (!snap.empty) {
      const docRef = doc(this.firestore, 'insuranceBonusCalculations', snap.docs[0].id);
      await setDoc(docRef, { ...calculation, updatedAt: Timestamp.now() }, { merge: true });
    }
  }
}
