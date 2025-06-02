import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { InsuranceSalaryCalculation, InsuranceBonusCalculation } from '../../../../core/models/insurance-calculation.model';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-insurance-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './insurance-list.component.html',
  styleUrl: './insurance-list.component.css'
})
export class InsuranceListComponent implements OnInit {
  resultList: any[] = [];
  selectedType: 'salary' | 'bonus' = 'salary';

  salaryList: InsuranceSalaryCalculation[] = [];
  bonusList: InsuranceBonusCalculation[] = [];
  companyKey: string = '';
  offices: any[] = [];
  employees: any[] = [];

  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;

  get filteredEmployees() {
    if (!this.selectedOfficeId) return this.employees;
    return this.employees.filter(emp => emp.officeId === this.selectedOfficeId);
  }

  constructor(
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        // Firestoreから給与・賞与計算結果を取得（companyKeyで絞り込み）
        const [salarySnap, bonusSnap] = await Promise.all([
          (await this.firestoreService.getInsuranceSalaryCalculations()).filter((c: any) => c.companyKey === this.companyKey),
          (await this.firestoreService.getInsuranceBonusCalculations()).filter((c: any) => c.companyKey === this.companyKey)
        ]);
        this.salaryList = salarySnap;
        this.bonusList = bonusSnap;
        console.log('salaryList:', this.salaryList);
        console.log('bonusList:', this.bonusList);
        this.updateResultList();
        console.log('resultList:', this.resultList);
      });
  }

  updateResultList() {
    const sourceList = this.selectedType === 'salary' ? this.salaryList : this.bonusList;
    // 支社・従業員・年月でフィルタ
    const filtered = sourceList.filter(row => {
      const officeMatch = !this.selectedOfficeId || row.officeId === this.selectedOfficeId;
      const empMatch = !this.selectedEmployeeId || row.employeeId === this.selectedEmployeeId;
      const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
      const ymMatch = !row.applyYearMonth || row.applyYearMonth === ym;
      return officeMatch && empMatch && ymMatch;
    });
    // 同じ従業員・支社・年月の組み合わせで最新の1件だけ残す
    const uniqueMap = new Map<string, any>();
    for (const row of filtered) {
      const key = `${row.employeeId}_${row.officeId}_${row.applyYearMonth}`;
      const prev = uniqueMap.get(key);
      if (!prev || new Date(row.updatedAt).getTime() > new Date(prev.updatedAt).getTime()) {
        uniqueMap.set(key, row);
      }
    }
    const uniqueList = Array.from(uniqueMap.values());
    // 支社名→従業員名の昇順でソート
    const sorted = [...uniqueList].sort((a, b) => {
      const officeA = this.offices.find(o => o.id === a.officeId)?.name || '';
      const officeB = this.offices.find(o => o.id === b.officeId)?.name || '';
      if (officeA !== officeB) return officeA.localeCompare(officeB, 'ja');
      const empA = this.employees.find(e => e.employeeId === a.employeeId);
      const empB = this.employees.find(e => e.employeeId === b.employeeId);
      const nameA = empA ? `${empA.lastName} ${empA.firstName}` : '';
      const nameB = empB ? `${empB.lastName} ${empB.firstName}` : '';
      return nameA.localeCompare(nameB, 'ja');
    });
    this.resultList = sorted.map(row => {
      const officeName = this.offices.find(o => o.id === row.officeId)?.name || '';
      const emp = this.employees.find(e => e.employeeId === row.employeeId);
      const employeeName = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const careInsurance = row.careInsurance === true ? '〇' : row.careInsurance === false ? '×' : 'ー';
      // 数値はカンマ区切り、未定義は「ー」
      const format = (v: any) => (v === undefined || v === null || v === '' || isNaN(v)) ? 'ー' : Number(v).toLocaleString();
      if (this.selectedType === 'salary') {
        return {
          officeName,
          employeeName,
          careInsurance,
          salaryTotal: format((row as any).salaryTotal),
          grade: (row as any).healthGrade || 'ー',
          monthly: format((row as any).healthMonthly),
          healthInsurance: format((row as any).healthInsurance),
          healthInsuranceDeduction: format((row as any).healthInsuranceDeduction),
          pension: format((row as any).pension),
          pensionDeduction: format((row as any).pensionDeduction),
          deductionTotal: format((row as any).deductionTotal),
          childcare: format((row as any).childcare),
          companyShare: format((row as any).companyShare)
        };
      } else {
        // ボーナス用: 標準賞与額・年度賞与合計の値をログ出力
        const bonusTotal = (row as any).bonusTotal;
        const standardBonus = (row as any).standardBonus;
        const annualBonusTotal = (row as any).annualBonusTotal;
        console.log('bonus row:', { employeeName, bonusTotal, standardBonus, annualBonusTotal, row });
        return {
          officeName,
          employeeName,
          careInsurance,
          bonus: format(bonusTotal),
          grade: (row as any).healthGrade || 'ー',
          monthly: format((row as any).healthMonthly),
          standardBonus: format(standardBonus),
          annualBonusTotal: format(annualBonusTotal),
          healthInsurance: format((row as any).healthInsurance),
          healthInsuranceDeduction: format((row as any).healthInsuranceDeduction),
          pension: format((row as any).pension),
          pensionDeduction: format((row as any).pensionDeduction),
          deductionTotal: format((row as any).deductionTotal),
          childcare: format((row as any).childcare),
          companyShare: format((row as any).companyShare)
        };
      }
    });
  }

  // ngModelの双方向バインドでselectedTypeが変わったときに呼ばれる
  // (AngularのngModelChangeイベントを使う場合は明示的に呼び出し可)
}
