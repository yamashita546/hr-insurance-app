import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  employeeDeductionTotal: number = 0;
  companyShareTotal: number = 0;
  insuranceTotal: number = 0;
  roundingErrorTotal: number = 0;
  employeeCount: number = 0;
  officeCount: number = 0;
  salaryTotal: number = 0;
  companyKey: string = '';

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        // 支社・従業員数取得
        const [offices, employees] = await Promise.all([
          this.firestoreService.getOffices(this.companyKey),
          this.firestoreService.getEmployeesByCompanyKey(this.companyKey)
        ]);
        this.officeCount = offices.length;
        this.employeeCount = employees.length;
        // 今月の給与・賞与計算結果取得
        const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const [salaryList, bonusList] = await Promise.all([
          (await this.firestoreService.getInsuranceSalaryCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym),
          (await this.firestoreService.getInsuranceBonusCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym)
        ]);
        // KPI集計
        const allList = [...salaryList, ...bonusList];
        this.employeeDeductionTotal = allList.reduce((sum, row) => sum + (Number(row.healthInsuranceDeduction) || 0) + (Number(row.pensionDeduction) || 0), 0);
        this.companyShareTotal = allList.reduce((sum, row) => sum + (Number(row.companyShare) || 0), 0);
        this.insuranceTotal = this.employeeDeductionTotal + this.companyShareTotal;
        // 修正: 給与・賞与で分けて合算
        this.salaryTotal =
          salaryList.reduce((sum, row) => sum + (Number(row.salaryTotal) || 0), 0) +
          bonusList.reduce((sum, row) => sum + (Number(row.bonusTotal) || 0), 0);
        // 端数誤差例（理論値との差分を合計）
        this.roundingErrorTotal = allList.reduce((sum, row) => {
          // 端数処理前の理論値（例: healthInsurance/2 + pension/2）
          const theoretical = ((Number(row.healthInsurance) || 0) / 2) + ((Number(row.pension) || 0) / 2);
          const actual = (Number(row.healthInsuranceDeduction) || 0) + (Number(row.pensionDeduction) || 0);
          return sum + (actual - Math.round(theoretical));
        }, 0);
      });
  }
}
