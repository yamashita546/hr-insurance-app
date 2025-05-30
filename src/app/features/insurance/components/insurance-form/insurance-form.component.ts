import { Component, OnInit } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChildcareInsuranceRate } from '../../../../core/models/insurance-rate.model';

@Component({
  selector: 'app-insurance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insurance-form.component.html',
  styleUrls: ['./insurance-form.component.css']
})
export class InsuranceFormComponent implements OnInit {
  companyId: string = '';
  companyDisplayId: string = '';
  companyName: string = '';
  offices: any[] = [];
  employees: any[] = [];
  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  previewList: any[] = [];
  standardMonthlyDecisions: any[] = [];
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  salaries: any[] = [];
  bonuses: any[] = [];
  selectedType: 'salary' | 'bonus' = 'salary';
  insuranceRates: any[] = [];

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyId), take(1))
      .subscribe(async company => {
        this.companyId = company!.companyId;
        this.companyDisplayId = company!.displayId;
        this.companyName = company!.name;
        this.offices = await this.firestoreService.getOffices(this.companyId);
        this.employees = await this.firestoreService.getEmployeesByCompanyId(this.companyId);
        this.standardMonthlyDecisions = await this.firestoreService.getStandardMonthlyDecisionsByCompanyId(this.companyId);
        this.salaries = await this.firestoreService.getSalariesByCompanyId(this.companyId);
        this.bonuses = await this.firestoreService.getBonusesByCompanyId(this.companyId);
        this.firestoreService.getInsuranceRates().subscribe(rates => {
          this.insuranceRates = rates;
        });
      });
  }

  get filteredEmployees() {
    if (!this.selectedOfficeId) return this.employees;
    return this.employees.filter(emp => emp.officeId === this.selectedOfficeId);
  }

  // 対象年月に適用されている標準報酬月額決定データを取得
  getStandardMonthlyForEmployee(employeeId: string, officeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const candidates = this.standardMonthlyDecisions
      .filter(r => r.employeeId === employeeId && r.officeId === officeId && r.applyYearMonth <= ym)
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
    console.log('getStandardMonthlyForEmployee:', { ym, employeeId, officeId, candidates, result: candidates[0] || null });
    return candidates[0] || null;
  }

  // 対象年月の給与・賞与を取得
  getSalaryForEmployee(employeeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    return this.salaries.find(s => s.employeeId === employeeId && s.targetYearMonth === ym) || null;
  }
  getBonusForEmployee(employeeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    return this.bonuses.find(b => b.employeeId === employeeId && b.targetYearMonth === ym) || null;
  }

  // 対象年月・都道府県・保険種別で該当レートを取得
  getInsuranceRateForOffice(officeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const office = this.offices.find(o => o.id === officeId);
    const prefectureCode = office?.insurancePrefecture;
    // validFrom <= ym <= validTo かつ 都道府県コード一致
    return this.insuranceRates.find(rate => {
      const from = rate.validFrom;
      const to = rate.validTo || '9999-12';
      return from <= ym && ym <= to && rate.prefectureCode === prefectureCode;
    }) || null;
  }

  // 年齢計算（対象年月の1日時点）
  getAgeAtYearMonth1st(birthday: string, year: number, month: number): number {
    const birth = new Date(birthday);
    const target = new Date(year, month - 1, 1);
    let age = target.getFullYear() - birth.getFullYear();
    if (target.getMonth() < birth.getMonth() || (target.getMonth() === birth.getMonth() && target.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // 四捨五入規則（0.5円未満切り捨て、0.5円以上切り上げ）
  roundHalfUp(val: number): number {
    const intPart = Math.floor(val);
    const decimal = val - intPart;
    if (decimal < 0.5) return intPart;
    return intPart + 1;
  }

  // 小数点以下が00なら整数、そうでなければ小数第2位まで表示
  formatDecimal(val: number): string {
    if (Number.isInteger(val)) return val.toLocaleString();
    const str = val.toFixed(2);
    if (str.endsWith('.00')) return parseInt(str, 10).toLocaleString();
    return Number(str).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onDecision() {
    let targetEmployees = this.filteredEmployees;
    if (this.selectedEmployeeId) {
      targetEmployees = targetEmployees.filter(emp => emp.employeeId === this.selectedEmployeeId);
    }
    if (this.selectedType === 'salary') {
      this.previewList = targetEmployees.map(emp => {
        const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
        const salary = this.getSalaryForEmployee(emp.employeeId);
        const rate = this.getInsuranceRateForOffice(emp.officeId);
        let careInsurance = '×';
        let healthInsurance = 'ー';
        let healthInsuranceDeduction = 'ー';
        let pension = 'ー';
        let pensionDeduction = 'ー';
        let deductionTotal = 'ー';
        let childcare = 'ー';
        let companyShare = 'ー';
        let grade = std ? `${std.healthGrade}（${std.pensionGrade}）` : 'ー';
        let monthly = std ? std.healthMonthly : 'ー';
        if (std && rate) {
          // 介護保険適用判定
          const age = this.getAgeAtYearMonth1st(emp.birthday, this.selectedYear, this.selectedMonth);
          const isCare = age >= 40 && age < 65;
          careInsurance = isCare ? '〇' : '×';
          // 料率
          let healthRate = rate.healthInsuranceRate;
          let careRate = isCare && rate.careInsuranceRate ? rate.careInsuranceRate : 0;
          let totalHealthRate = healthRate + careRate;
          let pensionRate = rate.employeePensionInsuranceRate;
          // 健康保険料
          const health = std.healthMonthly * (totalHealthRate / 100);
          healthInsurance = this.formatDecimal(health);
          // 健康保険料控除額
          const healthDeduct = this.roundHalfUp(std.healthMonthly * (totalHealthRate / 100) / 2);
          healthInsuranceDeduction = healthDeduct.toLocaleString();
          // 厚生年金保険料
          const pensionVal = std.healthMonthly * (pensionRate / 100);
          pension = this.formatDecimal(pensionVal);
          // 厚生年金保険料控除額
          const pensionDeduct = this.roundHalfUp(std.healthMonthly * (pensionRate / 100) / 2);
          pensionDeduction = pensionDeduct.toLocaleString();
          // 控除額合計
          const deductionSum = healthDeduct + pensionDeduct;
          deductionTotal = deductionSum.toLocaleString();
          // 子ども子育て拠出金
          const childcareVal = std.healthMonthly * (Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE) / 100);
          childcare = this.formatDecimal(childcareVal);
          // 会社負担
          const companyShareVal = deductionSum + childcareVal;
          companyShare = this.formatDecimal(companyShareVal);
        }
        return {
          officeId: emp.officeId,
          employeeId: emp.employeeId,
          officeName: this.offices.find(o => o.id === emp.officeId)?.name || '',
          employeeName: emp.lastName + ' ' + emp.firstName,
          careInsurance,
          salaryTotal: salary ? Number(salary.totalSalary).toLocaleString() : 'ー',
          grade,
          monthly: std ? Number(std.healthMonthly).toLocaleString() : 'ー',
          healthInsurance,
          healthInsuranceDeduction,
          pension,
          pensionDeduction,
          deductionTotal,
          childcare,
          companyShare
        };
      });
    } else if (this.selectedType === 'bonus') {
      this.previewList = targetEmployees.map(emp => {
        const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
        const bonus = this.getBonusForEmployee(emp.employeeId);
        const rate = this.getInsuranceRateForOffice(emp.officeId);
        // 介護保険適用判定（月額報酬と同じロジック）
        let careInsurance = '×';
        let isCare = false;
        if (emp.birthday) {
          const age = this.getAgeAtYearMonth1st(emp.birthday, this.selectedYear, this.selectedMonth);
          isCare = (age >= 40 && age < 65);
          careInsurance = isCare ? '〇' : '×';
        }
        let bonusAmount = bonus ? Number(bonus.bonusTotal) : null;
        let bonusDisplay = bonusAmount !== null ? bonusAmount.toLocaleString() : 'ー';
        // 標準賞与額（1000円未満切り捨て）
        let standardBonus: number | null = bonusAmount !== null ? Math.floor(bonusAmount / 1000) * 1000 : null;
        let standardBonusDisplay = standardBonus !== null ? standardBonus.toLocaleString() : 'ー';
        // 年度賞与合計
        let annualBonusTotal = 0;
        let annualBonusTotalDisplay = 'ー';
        if (emp.birthday) {
          // 年度の開始・終了年月
          const year = this.selectedYear;
          const month = this.selectedMonth;
          let fiscalYearStart, fiscalYearEnd;
          if (month >= 4) {
            fiscalYearStart = `${year}-04`;
            fiscalYearEnd = `${year + 1}-03`;
          } else {
            fiscalYearStart = `${year - 1}-04`;
            fiscalYearEnd = `${year}-03`;
          }
          // 対象従業員の年度内の賞与データを取得し、標準賞与額合計を算出
          const bonusesInYear = this.bonuses.filter(b => b.employeeId === emp.employeeId && b.targetYearMonth >= fiscalYearStart && b.targetYearMonth <= fiscalYearEnd);
          annualBonusTotal = bonusesInYear.reduce((acc, b) => acc + Math.floor(Number(b.bonusTotal) / 1000) * 1000, 0);
          annualBonusTotalDisplay = annualBonusTotal ? annualBonusTotal.toLocaleString() : 'ー';
        }
        // 健康保険料計算
        let healthInsurance = 'ー';
        let pension = 'ー';
        let childcare = 'ー';
        let healthInsuranceDeduction = 'ー';
        let pensionDeduction = 'ー';
        let deductionTotal = 'ー';
        let companyShare = 'ー';
        if (standardBonus !== null && rate) {
          // 年度賞与合計が573万円を超える場合の調整
          const limit = 5730000;
          let available = limit - (annualBonusTotal - standardBonus);
          let targetBonus = standardBonus;
          if (available <= 0) {
            healthInsurance = '0';
            pension = '0';
            childcare = '0';
            healthInsuranceDeduction = '0';
            pensionDeduction = '0';
            deductionTotal = '0';
            companyShare = '0';
          } else {
            if (annualBonusTotal > limit) {
              targetBonus = 0;
            } else if (annualBonusTotal > 0 && (annualBonusTotal - standardBonus) < limit && annualBonusTotal > limit) {
              targetBonus = available;
            } else if (annualBonusTotal + standardBonus > limit) {
              targetBonus = limit - (annualBonusTotal - standardBonus);
            }
            // 料率
            let healthRate = rate.healthInsuranceRate;
            let careRate = isCare && rate.careInsuranceRate ? rate.careInsuranceRate : 0;
            let totalHealthRate = healthRate + careRate;
            // 健康保険料
            const health = targetBonus * (totalHealthRate / 100);
            healthInsurance = this.formatDecimal(health);
            // 厚生年金保険料（標準賞与額は150万円上限）
            const pensionTarget = Math.min(targetBonus, 1500000);
            const pensionVal = pensionTarget * (rate.employeePensionInsuranceRate / 100);
            pension = this.formatDecimal(pensionVal);
            // 子ども子育て拠出金（標準賞与額は150万円上限）
            const childcareVal = pensionTarget * (Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE) / 100);
            childcare = this.formatDecimal(childcareVal);
            // 健康保険料控除額
            const healthDeduct = this.roundHalfUp(targetBonus * (totalHealthRate / 100) / 2);
            healthInsuranceDeduction = healthDeduct.toLocaleString();
            // 厚生年金保険料控除額
            const pensionDeduct = this.roundHalfUp(pensionTarget * (rate.employeePensionInsuranceRate / 100) / 2);
            pensionDeduction = pensionDeduct.toLocaleString();
            // 控除額合計
            const deductionSum = healthDeduct + pensionDeduct;
            deductionTotal = deductionSum.toLocaleString();
            // 会社負担
            const companyShareVal = deductionSum + childcareVal;
            companyShare = this.formatDecimal(companyShareVal);
          }
        }
        return {
          officeId: emp.officeId,
          employeeId: emp.employeeId,
          officeName: this.offices.find(o => o.id === emp.officeId)?.name || '',
          employeeName: emp.lastName + ' ' + emp.firstName,
          careInsurance,
          bonus: bonusDisplay,
          grade: std ? `${std.healthGrade}（${std.pensionGrade}）` : 'ー',
          monthly: std ? Number(std.healthMonthly).toLocaleString() : 'ー',
          standardBonus: standardBonusDisplay,
          annualBonusTotal: annualBonusTotalDisplay,
          healthInsurance,
          healthInsuranceDeduction,
          pension,
          pensionDeduction,
          deductionTotal,
          childcare,
          companyShare
        };
      });
    }
  }

  // 給与・賞与の計算結果保存処理
  async onSave() {
    const applyYearMonth = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // 当月データ存在チェック
    if (this.selectedType === 'salary') {
      const hasSalary = this.previewList.some(row => row.salaryTotal && row.salaryTotal !== 'ー');
      if (!hasSalary) {
        alert(`${this.selectedYear}年${this.selectedMonth}月の給与データの登録がありません。`);
        return;
      }
      const promises = this.previewList.map(async row => {
        const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceSalaryCalculation, 'createdAt' | 'updatedAt'> = {
          companyId: this.companyId,
          officeId: row.officeId,
          employeeId: row.employeeId,
          applyYearMonth,
          healthGrade: row.grade,
          healthMonthly: Number(row.monthly.toString().replace(/,/g, '')),
          pensionGrade: '', // 必要に応じてrowから取得
          pensionMonthly: 0, // 必要に応じてrowから取得
          salaryTotal: row.salaryTotal ? Number(row.salaryTotal.toString().replace(/,/g, '')) : 0,
          salaryAvg: 0, // 必要に応じて計算
          careInsurance: row.careInsurance === '〇',
          healthInsurance: Number(row.healthInsurance.toString().replace(/,/g, '')),
          healthInsuranceDeduction: Number(row.healthInsuranceDeduction.toString().replace(/,/g, '')),
          pension: Number(row.pension.toString().replace(/,/g, '')),
          pensionDeduction: Number(row.pensionDeduction.toString().replace(/,/g, '')),
          deductionTotal: Number(row.deductionTotal.toString().replace(/,/g, '')),
          childcare: Number(row.childcare.toString().replace(/,/g, '')),
          companyShare: Number(row.companyShare.toString().replace(/,/g, '')),
        };
        await this.firestoreService.addInsuranceSalaryCalculation(calculation);
      });
      await Promise.all(promises);
      alert(`${this.previewList.length}件の給与計算結果を保存しました。`);
    } else if (this.selectedType === 'bonus') {
      const hasBonus = this.previewList.some(row => row.bonus && row.bonus !== 'ー');
      if (!hasBonus) {
        alert(`${this.selectedYear}年${this.selectedMonth}月の賞与データの登録がありません。`);
        return;
      }
      const promises = this.previewList.map(async row => {
        const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceBonusCalculation, 'createdAt' | 'updatedAt'> = {
          companyId: this.companyId,
          officeId: row.officeId,
          employeeId: row.employeeId,
          applyYearMonth,
          healthGrade: row.grade,
          healthMonthly: Number(row.monthly.toString().replace(/,/g, '')),
          pensionGrade: '', // 必要に応じてrowから取得
          pensionMonthly: 0, // 必要に応じてrowから取得
          bonusTotal: row.bonus ? Number(row.bonus.toString().replace(/,/g, '')) : 0,
          bonusAvg: row.bonus ? Number(row.bonus.toString().replace(/,/g, '')) : 0, // 必要に応じて平均値を計算
          careInsurance: row.careInsurance === '〇',
          healthInsurance: Number(row.healthInsurance.toString().replace(/,/g, '')),
          healthInsuranceDeduction: Number(row.healthInsuranceDeduction.toString().replace(/,/g, '')),
          pension: Number(row.pension.toString().replace(/,/g, '')),
          pensionDeduction: Number(row.pensionDeduction.toString().replace(/,/g, '')),
          deductionTotal: Number(row.deductionTotal.toString().replace(/,/g, '')),
          childcare: Number(row.childcare.toString().replace(/,/g, '')),
          companyShare: Number(row.companyShare.toString().replace(/,/g, '')),
        };
        await this.firestoreService.addInsuranceBonusCalculation(calculation);
      });
      await Promise.all(promises);
      alert(`${this.previewList.length}件の賞与計算結果を保存しました。`);
    }
  }
}
