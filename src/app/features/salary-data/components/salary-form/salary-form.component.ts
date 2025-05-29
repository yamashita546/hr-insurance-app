import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { AppUser } from '../../../../core/models/user.model';
import { Office } from '../../../../core/models/company.model';
import { Employee } from '../../../../core/models/employee.model';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-salary-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary-form.component.html',
  styleUrl: './salary-form.component.css'
})
export class SalaryFormComponent implements OnInit {
  companyId: string | null = null;
  offices: Office[] = [];
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  selectedEmployeeObj: Employee | null = null;
  years: number[] = [];
  months: number[] = [];
  selectedYear: number;
  selectedMonth: number;
  activeTab: 'salary' | 'bonus' = 'salary';
  salaryForm: any = {};
  bonusForms: any[] = [{}];
  totalSalary: number = 0;
  isLoading = true;
  bonusRemark: string = '';

  get bonusTotal() {
    return this.bonusForms.reduce((sum, b) => sum + (Number(b.bonus) || 0), 0);
  }

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService
  ) {
    const now = new Date();
    const currentYear = now.getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      this.years.push(y);
    }
    for (let m = 1; m <= 12; m++) {
      this.months.push(m);
    }
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
  }

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(
        filter(company => !!company && !!company.companyId),
        take(1)
      )
      .subscribe(async company => {
        this.companyId = company!.companyId;
        this.offices = await this.firestoreService.getOffices(this.companyId);
        this.employees = await this.firestoreService.getEmployeesByCompanyId(this.companyId);
        this.filterEmployees();
        this.isLoading = false;
        this.calculateTotalSalary();
      });
  }

  onOfficeChange() {
    this.filterEmployees();
    this.selectedEmployeeId = '';
    this.selectedEmployeeObj = null;
  }

  onEmployeeChange() {
    this.selectedEmployeeObj = this.filteredEmployees.find(emp => emp.employeeId === this.selectedEmployeeId) || null;
    if (this.selectedEmployeeObj) {
      this.selectedOfficeId = this.selectedEmployeeObj.officeId;
      this.filterEmployees();
    }
  }

  filterEmployees() {
    if (this.selectedOfficeId) {
      this.filteredEmployees = this.employees.filter(emp => emp.officeId === this.selectedOfficeId);
    } else {
      this.filteredEmployees = this.employees;
    }
  }

  calculateTotalSalary() {
    const basic = Number(this.salaryForm.basicSalary) || 0;
    const overtime = Number(this.salaryForm.overtimeSalary) || 0;
    const commute = Number(this.salaryForm.commuteAllowance) || 0;
    const position = Number(this.salaryForm.positionAllowance) || 0;
    const other = Number(this.salaryForm.otherAllowance) || 0;
    this.totalSalary = basic + overtime + commute + position + other;
  }

  addBonusRow() {
    this.bonusForms.push({});
  }

  removeBonusRow(i: number) {
    if (this.bonusForms.length > 1) this.bonusForms.splice(i, 1);
  }

  async onSave() {
    if (!this.selectedEmployeeObj) return;
    const otherAllowances = [];
    if (this.salaryForm.commuteAllowance) {
      otherAllowances.push({
        otherAllowanceName: '通勤手当',
        otherAllowance: Number(this.salaryForm.commuteAllowance) || 0
      });
    }
    if (this.salaryForm.positionAllowance) {
      otherAllowances.push({
        otherAllowanceName: '役職手当',
        otherAllowance: Number(this.salaryForm.positionAllowance) || 0
      });
    }
    if (this.salaryForm.otherAllowance) {
      otherAllowances.push({
        otherAllowanceName: 'その他手当',
        otherAllowance: Number(this.salaryForm.otherAllowance) || 0
      });
    }
    const totalAllowance = otherAllowances.reduce((sum, a) => sum + (a.otherAllowance || 0), 0);
    const totalSalary = (Number(this.salaryForm.basicSalary) || 0) + (Number(this.salaryForm.overtimeSalary) || 0) + totalAllowance;
    const salary = {
      employeeId: this.selectedEmployeeObj.employeeId,
      targetYearMonth: `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`,
      basicSalary: Number(this.salaryForm.basicSalary) || 0,
      overtimeSalary: Number(this.salaryForm.overtimeSalary) || 0,
      otherAllowances: otherAllowances,
      totalAllowance,
      totalSalary,
      remarks: this.salaryForm.remarks || '',
    };
    await this.firestoreService.addSalary(salary);

    if (this.activeTab === 'bonus' && this.selectedEmployeeObj) {
      for (const bonus of this.bonusForms) {
        if (!bonus.bonusType) continue;
        const bonusData = {
          employeeId: this.selectedEmployeeObj.employeeId,
          targetYearMonth: `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`,
          bonusName: bonus.bonusType === 'その他賞与' ? bonus.bonusName : '',
          bonusType: bonus.bonusType,
          bonus: Number(bonus.bonus) || 0,
          bonusTotal: this.bonusTotal,
          remarks: this.bonusRemark || '',
        };
        await this.firestoreService.addBonus(bonusData);
      }
      alert('保存しました');
      this.onClear();
    }
  }

  onClear() {
    this.salaryForm = {};
    this.bonusForms = [{}];
    this.totalSalary = 0;
  }

  onShowHistory() {
    // 履歴を見るボタン押下時の処理があればここに
  }
}

