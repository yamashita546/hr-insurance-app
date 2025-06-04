import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-detail-salary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detail-salary.component.html',
  styleUrl: './detail-salary.component.css'
})
export class DetailSalaryComponent implements OnInit {
  employeeId: string = '';
  targetYear: string = '';
  targetMonth: string = '';
  selectedYear: number = 0;
  selectedMonth: number = 0;
  years: number[] = [];
  months: number[] = [];
  employee: any = null;
  salary: any = null;
  bonuses: any[] = [];
  activeTab: 'salary' | 'bonus' = 'salary';
  companyKey: string = '';

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    this.employeeId = this.route.snapshot.queryParamMap.get('employeeId') || '';
    this.targetYear = this.route.snapshot.queryParamMap.get('year') || '';
    this.targetMonth = this.route.snapshot.queryParamMap.get('month') || '';
    this.selectedYear = Number(this.targetYear) || new Date().getFullYear();
    this.selectedMonth = Number(this.targetMonth) || (new Date().getMonth() + 1);
    const now = new Date();
    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
      this.years.push(y);
    }
    for (let m = 1; m <= 12; m++) {
      this.months.push(m);
    }
    if (!this.employeeId) return;
    // companyKeyをUserCompanyServiceから取得
    this.userCompanyService.company$.subscribe(async company => {
      if (!company || !company.companyKey) return;
      this.companyKey = company.companyKey;
      // 従業員情報取得
      const allEmployees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
      this.employee = allEmployees.find(e => e.employeeId === this.employeeId);
      await this.loadSalaryAndBonus();
    });
  }

  async onYearMonthChange() {
    await this.loadSalaryAndBonus();
  }

  async loadSalaryAndBonus() {
    const ym = this.selectedYear && this.selectedMonth ? `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}` : '';
    if (ym && this.employee) {
      const salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
      this.salary = salaries.find(s => s.employeeId === this.employeeId && s.targetYearMonth === ym);
      const bonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey);
      this.bonuses = bonuses.filter(b => b.employeeId === this.employeeId && b.targetYearMonth === ym);
    }
  }
}
