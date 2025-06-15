import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';
import { EMPLOYEE_TYPES } from '../../../../core/models/employee.type';

@Component({
  selector: 'app-insurance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insurance-detail.component.html',
  styleUrl: './insurance-detail.component.css'
})
export class InsuranceDetailComponent implements OnInit {
  employees: any[] = [];
  selectedEmployeeId: string = '';
  insuranceSalaryCalculations: any[] = [];
  insuranceBonusCalculations: any[] = [];
  employeeInfo: any = null;

  constructor(
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        const companyKey = company!.companyKey;
        let employees = await this.firestoreService.getEmployeesByCompanyKey(companyKey);
        employees = employees.sort((a, b) => String(a.employeeId).localeCompare(String(b.employeeId), 'ja'));
        this.employees = employees;
        this.insuranceSalaryCalculations = await this.firestoreService.getInsuranceSalaryCalculationsByCompanyKey(companyKey);
        this.insuranceBonusCalculations = await this.firestoreService.getInsuranceBonusCalculationsByCompanyKey(companyKey);
        // 初期値として最初の従業員を選択
        if (this.employees.length > 0) {
          this.selectedEmployeeId = String(this.employees[0].employeeId);
          this.setEmployeeInfo();
        }
      });
  }

  setEmployeeInfo() {
    this.employeeInfo = this.employees.find(e => String(e.employeeId) === String(this.selectedEmployeeId));
  }

  get selectedEmployeeSalaryCalculations() {
    return this.insuranceSalaryCalculations.filter(row => row.employeeId === this.selectedEmployeeId);
  }
  get selectedEmployeeBonusCalculations() {
    return this.insuranceBonusCalculations.filter(row => row.employeeId === this.selectedEmployeeId);
  }

  onEmployeeChange() {
    this.setEmployeeInfo();
  }

  isNumber(val: any): boolean {
    return typeof val === 'number' && !isNaN(val);
  }

  getEmployeeTypeName(code: string): string {
    const type = EMPLOYEE_TYPES.find(t => t.code === code);
    return type ? type.name : 'ー';
  }
}
