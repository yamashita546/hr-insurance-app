import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';
import { EMPLOYEE_TYPES } from '../../../../core/models/employee.type';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-insurance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './insurance-detail.component.html',
  styleUrl: './insurance-detail.component.css'
})
export class InsuranceDetailComponent implements OnInit {
  employees: any[] = [];
  offices: any[] = [];
  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  insuranceSalaryCalculations: any[] = [];
  insuranceBonusCalculations: any[] = [];
  employeeInfo: any = null;

  constructor(
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService,
    private firestore: Firestore
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        const companyKey = company!.companyKey;
        this.offices = await this.firestoreService.getOffices(companyKey);
        const employeesCol = collection(this.firestore, 'employees');
        const q = query(employeesCol, where('companyKey', '==', companyKey));
        const snap = await getDocs(q);
        let employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        employees = employees.sort((a, b) => String(a.employeeId).localeCompare(String(b.employeeId), 'ja'));
        this.employees = employees;
        this.insuranceSalaryCalculations = await this.firestoreService.getInsuranceSalaryCalculationsByCompanyKey(companyKey);
        this.insuranceBonusCalculations = await this.firestoreService.getInsuranceBonusCalculationsByCompanyKey(companyKey);
        console.log('[賞与計算結果全件]', this.insuranceBonusCalculations);
        // isActiveがtrueの従業員のみ初期選択
        const active = this.activeEmployees;
        if (active.length > 0) {
          this.selectedEmployeeId = String(active[0].employeeId);
          this.setEmployeeInfo();
        } else {
          this.selectedEmployeeId = '';
          this.employeeInfo = null;
        }
      });
  }

  setEmployeeInfo() {
    this.employeeInfo = this.employees.find(e => String(e.employeeId) === String(this.selectedEmployeeId));
    console.log('選択された従業員情報（デバッグ用）:', this.employeeInfo);
  }

  get selectedEmployeeSalaryCalculations() {
    const emp = this.employees.find(e => String(e.employeeId) === String(this.selectedEmployeeId));
    if (!emp || emp.isActive === false) return [];
    return this.insuranceSalaryCalculations
      .filter(row => row.employeeId === this.selectedEmployeeId)
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
  }
  get selectedEmployeeBonusCalculations() {
    const emp = this.employees.find(e => String(e.employeeId) === String(this.selectedEmployeeId));
    if (!emp || emp.isActive === false) return [];
    return this.insuranceBonusCalculations
      .filter(row => row.employeeId === this.selectedEmployeeId)
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
  }

  onEmployeeChange() {
    this.setEmployeeInfo();
  }

  onOfficeChange() {
    const active = this.activeEmployees;
    if (active.length > 0) {
      this.selectedEmployeeId = String(active[0].employeeId);
    } else {
      this.selectedEmployeeId = '';
    }
    this.setEmployeeInfo();
  }

  isNumber(val: any): boolean {
    return typeof val === 'number' && !isNaN(val);
  }

  getEmployeeTypeName(code: string): string {
    const type = EMPLOYEE_TYPES.find(t => t.code === code);
    return type ? type.name : 'ー';
  }

  // isActiveがtrueの従業員のみ返すgetterを追加
  get activeEmployees() {
    let list = this.employees.filter(e => e.isActive !== false);
    if (this.selectedOfficeId) {
      list = list.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    return list;
  }

  get activeOffices() {
    return this.offices.filter(o => o.isActive !== false);
  }

  // 年齢到達月以降かどうか判定
  isAgeArrivedOrAfter(emp: any, targetAge: number): boolean {
    if (!emp || !emp.birthday) return false;
    const birth = new Date(emp.birthday);
    const now = new Date();
    const arrival = new Date(birth.getFullYear() + targetAge, birth.getMonth(), 1);
    return now >= arrival;
  }

  // 外国人特例判定
  isSpecialExemption(emp: any): boolean {
    const val = emp.foreignWorker?.hasSpecialExemption;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
  }

  // 産前産後休暇リスト取得
  getMaternityLeaves(emp: any): any[] {
    if (!emp || !Array.isArray(emp.extraordinaryLeaves)) return [];
    return emp.extraordinaryLeaves.filter((leave: any) => leave.leaveTypeCode === 'maternity');
  }

  // 育児休業リスト取得
  getChildcareLeaves(emp: any): any[] {
    if (!emp || !Array.isArray(emp.childcareLeaves)) return [];
    return emp.childcareLeaves;
  }
}
