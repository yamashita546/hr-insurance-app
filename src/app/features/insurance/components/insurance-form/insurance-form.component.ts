import { Component, OnInit } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChildcareInsuranceRate } from '../../../../core/models/insurance-rate.model';
import { Router, RouterModule  } from '@angular/router';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { isMaternityLeaveExempted, isChildcareLeaveExempted } from '../../../../core/services/childcare.leave.decision';
import { getAllAgeArrivalDates } from '../../../../core/services/age.determination';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';

@Component({
  selector: 'app-insurance-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './insurance-form.component.html',
  styleUrls: ['./insurance-form.component.css']
})
export class InsuranceFormComponent implements OnInit {
  companyKey: string = '';
  companyDisplayKey: string = '';
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
  missingStandardMonthlyEmployees: any[] = [];
  excludeRegisteredEmployees: boolean = false;
  registeredEmployeeIds: Set<string> = new Set();
  insuranceSalaryCalculations: any[] = [];
  insuranceBonusCalculations: any[] = [];
  selectedPopoverIndex: number | null = null;

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.companyDisplayKey = company!.companyKey;
        this.companyName = company!.name;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        this.standardMonthlyDecisions = await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey);
        this.salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
        this.bonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey);
        const allSalaryCalcs = await this.firestoreService.getInsuranceSalaryCalculations();
        this.insuranceSalaryCalculations = allSalaryCalcs.filter((c: any) => c.companyKey === this.companyKey);
        const allBonusCalcs = await this.firestoreService.getInsuranceBonusCalculations();
        this.insuranceBonusCalculations = allBonusCalcs.filter((c: any) => c.companyKey === this.companyKey);
        this.firestoreService.getInsuranceRates().subscribe(rates => {
          this.insuranceRates = rates;
        });
        this.updateRegisteredEmployeeIds();
        console.log('全従業員:', this.employees);
        const satoTaro = this.employees.find(e => e.lastName === '佐藤' && e.firstName === '太郎');
        console.log('佐藤太郎データ:', satoTaro);
      });
  }

  updateRegisteredEmployeeIds() {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    if (this.selectedType === 'salary') {
      this.registeredEmployeeIds = new Set(
        this.insuranceSalaryCalculations
          .filter(s => s.applyYearMonth === ym)
          .map(s => s.employeeId)
      );
    } else if (this.selectedType === 'bonus') {
      this.registeredEmployeeIds = new Set(
        this.insuranceBonusCalculations
          .filter(s => s.applyYearMonth === ym)
          .map(s => s.employeeId)
      );
    } else {
      this.registeredEmployeeIds = new Set();
    }
  }

  onExcludeRegisteredChange() {
    // 必要なら再取得や再描画
  }

  get filteredEmployees() {
    let list = this.employees.filter(emp =>
      isEmployeeSelectable(emp, this.selectedYear?.toString(), this.selectedMonth?.toString())
    );
    if (this.selectedOfficeId) {
      list = list.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.excludeRegisteredEmployees) {
      list = list.filter(emp => !this.registeredEmployeeIds.has(emp.employeeId));
    }
    return list;
  }

  // 対象年月に適用されている標準報酬月額決定データを取得
  getStandardMonthlyForEmployee(employeeId: string, officeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const candidates = this.standardMonthlyDecisions
      .filter(r =>
        r.employeeId === employeeId &&
        r.companyKey === this.companyKey &&
        r.applyYearMonth <= ym &&
        r.isActive !== false
      )
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
    const std = candidates[0] || null;
    console.log(`標準報酬月額（${this.employees.find(e => e.employeeId === employeeId)?.lastName || ''} ${this.employees.find(e => e.employeeId === employeeId)?.firstName || ''}）:`, std);
    return std;
  }

  // 対象年月の給与・賞与を取得
  getSalaryForEmployee(employeeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const salary = this.salaries.find(s => s.employeeId === employeeId && s.targetYearMonth === ym) || null;
    console.log(`給与データ（${this.employees.find(e => e.employeeId === employeeId)?.lastName || ''} ${this.employees.find(e => e.employeeId === employeeId)?.firstName || ''}）:`, salary);
    return salary;
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
    // 条件に合う全ての料率を抽出
    const candidates = this.insuranceRates.filter(rate => {
      const from = rate.validFrom;
      const to = rate.validTo || '9999-12';
      return from <= ym && ym <= to && rate.prefectureCode === prefectureCode;
    });
    // validFromが一番新しいものを選択
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, curr) => curr.validFrom > latest.validFrom ? curr : latest);
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

  // 社会保険料の端数処理（0.50円以下切り捨て、0.51円以上切り上げ、0.50は切り捨て）
  roundSocialInsurance(val: number): number {
    const intPart = Math.floor(val);
    const decimal = val - intPart;
    if (decimal < 0.5) return intPart;
    if (decimal > 0.5) return intPart + 1;
    // ちょうど0.5の場合は切り捨て
    return intPart;
  }

  // 小数点以下が00なら整数、そうでなければ小数第2位まで表示
  formatDecimal(val: number): string {
    if (Number.isInteger(val)) return val.toLocaleString();
    const str = val.toFixed(2);
    if (str.endsWith('.00')) return parseInt(str, 10).toLocaleString();
    return Number(str).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // 共通: 対象年月で在籍しているか判定
  isActiveEmployeeForTargetMonth(emp: any, year: number, month: number): boolean {
    const startDate = emp.contractStartDate ? new Date(emp.contractStartDate) : null;
    const endDate = emp.contractEndDate ? new Date(emp.contractEndDate) : null;
    const targetDate = new Date(year, month - 1, 1);
    if (startDate && targetDate < startDate) return false;
    if (endDate && targetDate > endDate) return false;
    return true;
  }

  // 外国人特例判定の型吸収関数
  isSpecialExemption(emp: any): boolean {
    const val = emp.foreignWorker?.hasSpecialExemption;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
  }

  // 対象年月の月内に各年齢到達日が含まれているかを判定する関数
  isAgeArrivalInMonth(emp: any, year: number, month: number): { [age: number]: boolean } {
    if (!emp.birthday) return { 40: false, 65: false, 70: false, 75: false };
    const arrivalDates = getAllAgeArrivalDates(emp.birthday);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // 月末日
    const result: { [age: number]: boolean } = {};
    [40, 65, 70, 75].forEach(age => {
      const arrival = arrivalDates[age];
      result[age] = arrival ? (arrival >= monthStart && arrival <= monthEnd) : false;
    });
    return result;
  }

  onDecision() {
    let targetEmployees = this.filteredEmployees;
    if (this.selectedEmployeeId) {
      targetEmployees = targetEmployees.filter(emp => emp.employeeId === this.selectedEmployeeId);
    }
    // 標準報酬月額未登録従業員リストを初期化
    this.missingStandardMonthlyEmployees = [];
    // 対象年月の月末日
    const targetYm = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const targetMonthEnd = new Date(this.selectedYear, this.selectedMonth, 0); // 月末日

    // 追加: 給与データ未登録者チェック
    if (this.selectedType === 'salary') {
      const missingSalaryEmployees = targetEmployees.filter(emp => {
        if (!this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) return false;
        const salary = this.getSalaryForEmployee(emp.employeeId);
        return !salary || salary.totalSalary == null || salary.totalSalary === '';
      });
      if (missingSalaryEmployees.length > 0) {
        const names = missingSalaryEmployees.map(emp => `${this.offices.find(o => o.id === emp.officeId)?.name || ''} ${emp.lastName} ${emp.firstName}`).join('\n');
        alert(`当月給与データが登録されていない従業員がいます:\n${names}`);
        return;
      }
    }

    console.log('onDecision: targetEmployees', targetEmployees.map(e => e.lastName + e.firstName));

    if (this.selectedType === 'salary') {
      this.previewList = targetEmployees
        .filter(emp => {
          // 入社前・退社後は対象外
          if (!this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) return false;
          // 社会保険未加入は対象外
          if (!emp.healthInsuranceStatus?.isApplicable) return false;
          // 喪失日がある場合、対象年月の月末より前なら対象外
          const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
          if (lossDateRaw) {
            const lossDate = new Date(lossDateRaw);
            const targetMonthEnd = new Date(this.selectedYear, this.selectedMonth, 0); // 月末
            if (!isNaN(lossDate.getTime()) && lossDate < targetMonthEnd) {
              return false;
            }
          }
          return true;
        })
        .map(emp => {
          // 対象年月の1日
          const ymDate = new Date(this.selectedYear, this.selectedMonth - 1, 1);
          const ymStr = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
          // 産前産後休業・育児休業の免除判定
          const isMaternityExempted = isMaternityLeaveExempted(emp, ymStr);
          const isChildcareExempted = isChildcareLeaveExempted(emp, ymStr);
          // 各保険の適用判定
          let healthApplicable = emp.healthInsuranceStatus?.isApplicable;
          let pensionApplicable = emp.pensionStatus?.isApplicable;
          let employmentApplicable = emp.employmentInsuranceStatus?.isApplicable;
          let careApplicable = emp.isCareInsuranceApplicable;
          // 年齢到達月判定
          const ageArrival = this.isAgeArrivalInMonth(emp, this.selectedYear, this.selectedMonth);
          // 外国人特例（厚生年金免除）
          if (emp.isForeignWorker && this.isSpecialExemption(emp)) {
            pensionApplicable = false;
          }
          // 70歳到達月は厚生年金対象外
          if (ageArrival[70]) {
            pensionApplicable = false;
          }
          // 75歳到達月は健康保険対象外
          if (ageArrival[75]) {
            healthApplicable = false;
          }
          // 休業特例による免除（健康保険・厚生年金）
          if (isMaternityExempted || isChildcareExempted) {
            healthApplicable = false;
            pensionApplicable = false;
          }
          // 休職特例（期間中は免除）
          if (Array.isArray(emp.extraordinaryLeaves)) {
            for (const leave of emp.extraordinaryLeaves) {
              // 健康保険免除
              if (leave.isHealthInsuranceExempted && leave.leaveStartDate && leave.leaveEndDate) {
                if (ymDate >= new Date(leave.leaveStartDate) && ymDate <= new Date(leave.leaveEndDate)) {
                  healthApplicable = false;
                }
              }
              // 厚生年金免除
              if (leave.isPensionExempted && leave.leaveStartDate && leave.leaveEndDate) {
                if (ymDate >= new Date(leave.leaveStartDate) && ymDate <= new Date(leave.leaveEndDate)) {
                  pensionApplicable = false;
                }
              }
              // 雇用保険免除
              if (leave.isEmploymentInsuranceExempted && leave.leaveStartDate && leave.leaveEndDate) {
                if (ymDate >= new Date(leave.leaveStartDate) && ymDate <= new Date(leave.leaveEndDate)) {
                  employmentApplicable = false;
                }
              }
              // 介護保険免除
              if (leave.isCareInsuranceExempted && leave.leaveStartDate && leave.leaveEndDate) {
                if (ymDate >= new Date(leave.leaveStartDate) && ymDate <= new Date(leave.leaveEndDate)) {
                  careApplicable = false;
                }
              }
            }
          }
          // 標準報酬月額の有効性チェック
          const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
          if ((healthApplicable || pensionApplicable) && !std && this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) {
            this.missingStandardMonthlyEmployees.push(emp);
          }
          const salary = this.getSalaryForEmployee(emp.employeeId);
          const rate = this.getInsuranceRateForOffice(emp.officeId);
          // 各項目取得
          const basic = salary ? Number(salary.basicSalary || 0) : 0;
          const overtime = salary ? Number(salary.overtimeSalary || 0) : 0;
          const position = salary ? Number(salary.positionAllowance || 0) : 0;
          const commute = salary ? Number(salary.commuteAllowance || 0) : 0;
          const other = salary ? Number(salary.otherAllowance || 0) : 0;
          // 総手当は役職手当＋通勤費＋その他手当
          const totalAllowance = position + commute + other;
          // 総支給額（再計算）
          const calcTotal = basic + overtime + position + commute + other;
          const totalSalary = salary ? Number(salary.totalSalary || 0) : 0;
          // ダブルチェック
          const isMatch = Math.abs(calcTotal - totalSalary) < 1; // 1円未満の誤差は許容
          // 調査用ログ
          // console.log('salary breakdown:', { basic, overtime, position, commute, other, totalAllowance, calcTotal, totalSalary, isMatch });
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
          let careRate = 0;
          let insuranceTotal = 0;
          let healthRate = 0;
          let pensionRate = 0;
          let childcareRate = 0;
          let prefectureName = '';
          if (std && rate) {
            // 介護保険適用判定
            const age = this.getAgeAtYearMonth1st(emp.birthday, this.selectedYear, this.selectedMonth);
            const ageArrival = this.isAgeArrivalInMonth(emp, this.selectedYear, this.selectedMonth);
            // 介護保険の適用判定: 40歳到達月から65歳到達月の前月まで
            let isCare = false;
            if (emp.isCareInsuranceApplicable) {
              const isAfter40 = age > 40 || (age === 40) || ageArrival[40];
              const isBefore65 = age < 65 || (age === 65 && !ageArrival[65]);
              isCare = isAfter40 && isBefore65;
            }
            careInsurance = isCare ? '〇' : '×';
            healthRate = rate.healthInsuranceRate;
            careRate = isCare && rate.careInsuranceRate ? rate.careInsuranceRate : 0;
            let totalHealthRate = healthRate + careRate;
            pensionRate = rate.employeePensionInsuranceRate;
            childcareRate = Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE);
            insuranceTotal = std.healthMonthly * (totalHealthRate / 100) + std.healthMonthly * (pensionRate / 100) + std.healthMonthly * (childcareRate / 100);
            // 都道府県名
            const office = this.offices.find(o => o.id === emp.officeId);
            if (office && office.insurancePrefecture) {
              const pref = PREFECTURES.find(p => p.code === office.insurancePrefecture);
              prefectureName = pref ? pref.name : '';
            }
            // 健康保険料
            if (healthApplicable) {
              const healthTotal = std.healthMonthly * (totalHealthRate / 100); // 保険料総額
              healthInsurance = this.formatDecimal(healthTotal);
              // 健康保険料控除額（労働者負担額）
              const healthDeduct = this.roundSocialInsurance(healthTotal / 2);
              healthInsuranceDeduction = healthDeduct.toLocaleString();
              // 会社負担（健康保険分のみ）
              const healthCompany = healthTotal - healthDeduct;
              // 控除額合計（健康保険分のみ）
              deductionTotal = healthDeduct.toLocaleString();
              // 子ども子育て拠出金
              const childcareVal = std.healthMonthly * (Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE) / 100);
              childcare = this.formatDecimal(childcareVal);
              // 会社負担（健康保険分のみ＋子ども子育て拠出金）
              companyShare = this.formatDecimal(healthCompany + childcareVal);
            }
            // 厚生年金保険料
            if (pensionApplicable) {
              const pensionTotal = std.healthMonthly * (pensionRate / 100); // 保険料総額
              pension = this.formatDecimal(pensionTotal);
              // 厚生年金保険料控除額（労働者負担額）
              const pensionDeduct = this.roundSocialInsurance(pensionTotal / 2);
              pensionDeduction = pensionDeduct.toLocaleString();
              // 会社負担（厚生年金分のみ）
              const pensionCompany = pensionTotal - pensionDeduct;
              // 控除額合計（健康保険＋年金）
              if (healthApplicable) {
                deductionTotal = (Number(healthInsuranceDeduction.replace(/,/g, '')) + pensionDeduct).toLocaleString();
                companyShare = this.formatDecimal(Number(companyShare.replace(/,/g, '')) + pensionCompany);
              } else {
                deductionTotal = pensionDeduct.toLocaleString();
                companyShare = this.formatDecimal(pensionCompany);
              }
            }
          }
          // ここで免除特例を取得
          const appliedExemptions = this.getAppliedExemptions(emp, this.selectedYear, this.selectedMonth);
          return {
            officeId: emp.officeId,
            employeeId: emp.employeeId,
            officeName: this.offices.find(o => o.id === emp.officeId)?.name || '',
            employeeName: emp.lastName + ' ' + emp.firstName,
            careInsurance,
            salaryTotal: salary ? Number(salary.totalSalary).toLocaleString() : 'ー',
            salaryBreakdown: {
              basic,
              overtime,
              position,
              commute,
              other,
              totalAllowance,
              calcTotal,
              totalSalary,
              isMatch
            },
            grade,
            monthly: std ? Number(std.healthMonthly).toLocaleString() : 'ー',
            healthInsurance,
            healthInsuranceDeduction,
            pension,
            pensionDeduction,
            deductionTotal,
            childcare,
            companyShare,
            // 追加項目
            prefectureName,
            healthRate,
            careRate,
            pensionRate,
            childcareRate,
            insuranceTotal,
            appliedExemptions,
          };
        });
    } else if (this.selectedType === 'bonus') {
      this.previewList = targetEmployees
        .filter(emp => {
          // 入社前・退社後は対象外
          if (!this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) return false;
          // 社会保険未加入は対象外
          if (!emp.healthInsuranceStatus?.isApplicable) return false;
          // 喪失日がある場合、対象年月の月末より前なら対象外
          return true;
        })
        .map(emp => {
          const ymStr = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
          // 産前産後休業・育児休業の免除判定
          const isMaternityExempted = isMaternityLeaveExempted(emp, ymStr);
          const isChildcareExempted = isChildcareLeaveExempted(emp, ymStr);
          const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
          const bonus = this.getBonusForEmployee(emp.employeeId);
          const rate = this.getInsuranceRateForOffice(emp.officeId);
          // 各保険の適用判定
          let healthApplicable = emp.healthInsuranceStatus?.isApplicable;
          const ageArrival = this.isAgeArrivalInMonth(emp, this.selectedYear, this.selectedMonth);
          // 75歳到達月は健康保険対象外
          if (ageArrival[75]) {
            healthApplicable = false;
          }
          let careInsurance = '×';
          let isCare = false;
          if (emp.birthday) {
            const age = this.getAgeAtYearMonth1st(emp.birthday, this.selectedYear, this.selectedMonth);
            // 介護保険の適用判定: 40歳到達月から65歳到達月の前月まで
            // 給与と同じロジック
            if (emp.isCareInsuranceApplicable) {
              const isAfter40 = age > 40 || (age === 40) || ageArrival[40];
              const isBefore65 = age < 65 || (age === 65 && !ageArrival[65]);
              isCare = isAfter40 && isBefore65;
            }
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
          // 休業特例による免除（健康保険・厚生年金）
          let healthExempted = isMaternityExempted || isChildcareExempted;
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
            if (available <= 0 || healthExempted) {
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
              const healthDeduct = this.roundSocialInsurance(health / 2);
              healthInsuranceDeduction = healthDeduct.toLocaleString();
              // 厚生年金保険料控除額
              const pensionDeduct = this.roundSocialInsurance(pensionVal / 2);
              pensionDeduction = pensionDeduct.toLocaleString();
              // 控除額合計
              const deductionSum = healthDeduct + pensionDeduct;
              deductionTotal = deductionSum.toLocaleString();
              // 会社負担
              const companyShareVal = deductionSum + childcareVal;
              companyShare = this.formatDecimal(companyShareVal);
            }
          }
          // ここで免除特例を取得
          const appliedExemptions = this.getAppliedExemptions(emp, this.selectedYear, this.selectedMonth);
          return {
            officeId: emp.officeId,
            employeeId: emp.employeeId,
            officeName: this.offices.find(o => o.id === emp.officeId)?.name || '',
            employeeName: emp.lastName + ' ' + emp.firstName,
            careInsurance,
            bonus: bonusDisplay,
            grade: std ? `${std.healthGrade}（${std.pensionGrade}）` : 'ー',
            monthly: std ? Number(std.healthMonthly).toLocaleString() : 'ー',
            standardBonus,
            annualBonusTotal,
            standardBonusDisplay,
            annualBonusTotalDisplay,
            healthInsurance,
            healthInsuranceDeduction,
            pension,
            pensionDeduction,
            deductionTotal,
            childcare,
            companyShare,
            // 追加項目
            prefectureName: '',
            healthRate: 0,
            careRate: 0,
            pensionRate: 0,
            childcareRate: 0,
            insuranceTotal: 0,
            appliedExemptions,
          };
        });
    }
    console.log('previewListに入る従業員:', this.previewList ? this.previewList.map(e => e.employeeName) : []);
    // 標準報酬・給与データ取得時
    targetEmployees.forEach(emp => {
      const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
      console.log(`標準報酬月額（${emp.lastName}${emp.firstName}）:`, std);
      const salary = this.getSalaryForEmployee(emp.employeeId);
      console.log(`給与データ（${emp.lastName}${emp.firstName}）:`, salary);
    });
  }

  // 給与・賞与の計算結果保存処理
  async onSave() {
    const applyYearMonth = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // 当月データ存在チェック
    if (this.selectedType === 'salary') {
      // 既存給与データの重複チェック
      const existingSalaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey!);
      const duplicateRows = this.previewList.filter(row =>
        existingSalaries.some(s => s.employeeId === row.employeeId && s.targetYearMonth === applyYearMonth)
      );
      if (duplicateRows.length > 0) {
        const names = duplicateRows.map(row => `${row.officeName} ${row.employeeName}`).join('\n');
        alert(`既に給与が登録されている従業員がいます:\n${names}`);
        return;
      }
      const hasSalary = this.previewList.some(row => row.salaryTotal && row.salaryTotal !== 'ー');
      if (!hasSalary) {
        alert(`${this.selectedYear}年${this.selectedMonth}月の給与データの登録がありません。`);
        return;
      }
      const promises = this.previewList.map(async row => {
        const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceSalaryCalculation, 'createdAt' | 'updatedAt'> = {
          companyKey: this.companyKey,
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
      this.router.navigate(['/insurance-list']);
    } else if (this.selectedType === 'bonus') {
      // 対象月に賞与データが未登録の従業員を抽出
      const missingBonusEmployees = this.previewList.filter(row => !row.bonus || row.bonus === 'ー');
      if (missingBonusEmployees.length > 0) {
        const names = missingBonusEmployees.map(row => `${row.officeName} ${row.employeeName}`).join('\n');
        alert(`当月賞与データが登録されていない従業員がいます:\n${names}`);
        return;
      }
      const promises = this.previewList.map(async row => {
        const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceBonusCalculation, 'createdAt' | 'updatedAt'> = {
          companyKey: this.companyKey,
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
          standardBonus: row.standardBonus ?? 0,
          annualBonusTotal: row.annualBonusTotal ?? 0
        };
        await this.firestoreService.addInsuranceBonusCalculation(calculation);
      });
      await Promise.all(promises);
      alert(`${this.previewList.length}件の賞与計算結果を保存しました。`);
      this.router.navigate(['/insurance-calc']);
    }
  }

  // イベントハンドラ追加
  onTypeChange(val: 'salary' | 'bonus') {
    this.selectedType = val;
    this.updateRegisteredEmployeeIds();
  }
  onYearChange(val: number) {
    this.selectedYear = val;
    this.updateRegisteredEmployeeIds();
  }
  onMonthChange(val: number) {
    this.selectedMonth = val;
    this.updateRegisteredEmployeeIds();
  }

  // 賞与プレビュー行の削除
  removeBonusRow(index: number) {
    const row = this.previewList[index];
    const msg = `本当に「${row.officeName} ${row.employeeName}」を削除してよろしいですか？`;
    if (confirm(msg)) {
      this.previewList.splice(index, 1);
    }
  }

  closePopover() {
    this.selectedPopoverIndex = null;
  }

  removeSalaryRow(index: number) {
    const row = this.previewList[index];
    const msg = `本当に「${row.officeName} ${row.employeeName}」を削除してよろしいですか？`;
    if (confirm(msg)) {
      this.previewList.splice(index, 1);
      if (this.selectedPopoverIndex === index) {
        this.selectedPopoverIndex = null;
      } else if (this.selectedPopoverIndex !== null && this.selectedPopoverIndex > index) {
        this.selectedPopoverIndex--;
      }
    }
  }

  /**
   * 対象従業員・年月に適用されている免除特例を配列で返す
   * @param emp 従業員データ
   * @param year 年
   * @param month 月
   * @returns string[] 適用された免除特例の説明
   */
  getAppliedExemptions(emp: any, year: number, month: number): string[] {
    const result: string[] = [];
    const ymStr = `${year}-${String(month).padStart(2, '0')}`;
    // 産休
    if (isMaternityLeaveExempted(emp, ymStr)) {
      result.push('産前産後休業免除');
    }
    // 育休
    if (isChildcareLeaveExempted(emp, ymStr)) {
      result.push('育児休業免除');
    }
    // 外国人特例
    if (emp.isForeignWorker && this.isSpecialExemption(emp)) {
      result.push('外国人特例（厚生年金免除）');
    }
    // 年齢による資格喪失
    const ageArrival = this.isAgeArrivalInMonth(emp, year, month);
    if (ageArrival[70]) {
      result.push('厚生年金：70歳到達による資格喪失');
    }
    if (ageArrival[75]) {
      result.push('健康保険：75歳到達による資格喪失');
    }
    return result;
  }
}
