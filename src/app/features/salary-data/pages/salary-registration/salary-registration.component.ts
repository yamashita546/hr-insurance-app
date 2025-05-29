import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-salary-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './salary-registration.component.html',
  styleUrl: './salary-registration.component.css'
})
export class SalaryRegistrationComponent {
  years: number[] = [];
  months: number[] = [];
  branches: string[] = ['本社', '東京支社'];
  selectedYear: number;
  selectedMonth: number;
  selectedBranch: string = '';
  searchKeyword: string = '';
  sortKey: string = '';
  sortAsc: boolean = true;

  companyId: string = '';
  companyDisplayId: string = '';
  companyName: string = '';

  employees: any[] = [];
  allSalaries: any[] = [];
  allBonuses: any[] = [];

  get filteredEmployees() {
    let result = this.employees;
    if (this.selectedBranch) {
      result = result.filter(e => e.branch === this.selectedBranch);
    }
    if (this.searchKeyword) {
      result = result.filter(e => e.name.includes(this.searchKeyword));
    }
    if (this.sortKey) {
      result = result.slice().sort((a, b) => {
        const key = this.sortKey as keyof typeof a;
        if (a[key] < b[key]) return this.sortAsc ? -1 : 1;
        if (a[key] > b[key]) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }
    return result;
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

  async loadData() {
    // Firestoreから従業員・給与・賞与データを取得
    this.employees = await this.firestoreService.getEmployeesByCompanyId(this.companyId);
    this.allSalaries = await this.firestoreService.getSalariesByCompanyId(this.companyId);
    this.allBonuses = await this.firestoreService.getBonusesByCompanyId(this.companyId);
    console.log('従業員:', this.employees);
    console.log('給与:', this.allSalaries);
    console.log('賞与:', this.allBonuses);
    // 年月でフィルタ
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // 従業員ごとに給与・賞与を集計
    this.employees = this.employees.map(emp => {
      const salary = this.allSalaries.find(s => s.employeeId === emp.employeeId && s.targetYearMonth === ym);
      const bonuses = this.allBonuses.filter(b => b.employeeId === emp.employeeId && b.targetYearMonth === ym);
      const bonusSum = bonuses.reduce((sum, b) => sum + (b.bonus || 0), 0);
      return {
        name: emp.lastName + ' ' + emp.firstName,
        branch: emp.officeName || '',
        baseSalary: salary?.basicSalary || 0,
        overtime: salary?.overtimeSalary || 0,
        allowance: salary?.totalAllowance || 0,
        totalSalary: (salary?.totalSalary || 0) + bonusSum,
        bonus: bonusSum,
        status: salary || bonuses.length ? '登録済' : '未登録',
        employeeId: emp.employeeId
      };
    });
  }

  onSearch() {
    // 検索ボタン押下時の追加処理があればここに
  }

  sortBy(key: keyof typeof this.employees[0]) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key as string;
      this.sortAsc = true;
    }
  }
  onRegisterSalary(employee: any) {
    // 登録・編集ボタン押下時の処理があればここに
  }

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(
        filter(company => !!company && !!company.companyId),
        take(1)
      )
      .subscribe(async company => {
        this.companyId = company!.companyId;
        this.companyDisplayId = company!.displayId;
        this.companyName = company!.name;
        // 支社一覧をFirestoreから取得
        const offices = await this.firestoreService.getOffices(this.companyId);
        this.branches = ['全支社', ...offices.map(o => o.name)];
        // 初期化後に必ずloadDataを呼ぶ
        setTimeout(() => this.loadData(), 0);
      });
  }

  onYearChange() {
    this.loadData();
  }
  onMonthChange() {
    this.loadData();
  }
  onBranchChange() {
    this.loadData();
  }
}
