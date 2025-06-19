import { Component, OnInit } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChildcareInsuranceRate } from '../../../../core/models/insurance-rate.model';
import { Router, RouterModule  } from '@angular/router';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { isMaternityLeaveExempted, isChildcareLeaveExempted, checkInsuranceExemption } from '../../service/check.service';
import { getAllAgeArrivalDates } from '../../../../core/services/age.determination';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';
import { generateBonusPreviewList } from '../../service/bonus.check';
import { NATIONALITIES } from '../../../../core/models/nationalities';
import { AgeCheck } from '../../service/age.check';
import { checkEmployeeInputMissing } from '../../service/null.check';
import { InsuranceCalculator } from '../../service/calculate.service';
import { isCareInsuranceApplicableForDisplay } from '../../service/care-insurance.check';


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
  excludeNoBonusEmployees: boolean = false;

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
    // console.log(`標準報酬月額（${this.employees.find(e => e.employeeId === employeeId)?.lastName || ''} ${this.employees.find(e => e.employeeId === employeeId)?.firstName || ''}）:`, std);
    return std;
  }

  // 対象年月の給与・賞与を取得
  getSalaryForEmployee(employeeId: string): any {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const salary = this.salaries.find(s => s.employeeId === employeeId && s.targetYearMonth === ym) || null;
    // console.log(`給与データ（${this.employees.find(e => e.employeeId === employeeId)?.lastName || ''} ${this.employees.find(e => e.employeeId === employeeId)?.firstName || ''}）:`, salary);
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

    // 日付部分だけで比較
    const toYMD = (d: Date | null) => d ? `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` : '';
    if (startDate && toYMD(targetDate) < toYMD(startDate)) return false;
    if (endDate && toYMD(targetDate) > toYMD(endDate)) return false;

    // 健康保険・厚生年金の資格取得日・喪失日も考慮
    // どちらか一方でも適用されていれば対象
    let hasValidInsurance = false;
    // 健康保険
    if (emp.healthInsuranceStatus?.isApplicable) {
      const acq = emp.healthInsuranceStatus.acquisitionDate ? new Date(emp.healthInsuranceStatus.acquisitionDate) : null;
      const loss = emp.healthInsuranceStatus.lossDate ? new Date(emp.healthInsuranceStatus.lossDate) : null;
      if ((!acq || toYMD(targetDate) >= toYMD(acq)) && (!loss || toYMD(targetDate) < toYMD(loss))) {
        hasValidInsurance = true;
      }
    }
    // 厚生年金
    if (emp.pensionStatus?.isApplicable) {
      const acq = emp.pensionStatus.acquisitionDate ? new Date(emp.pensionStatus.acquisitionDate) : null;
      const loss = emp.pensionStatus.lossDate ? new Date(emp.pensionStatus.lossDate) : null;
      if ((!acq || toYMD(targetDate) >= toYMD(acq)) && (!loss || toYMD(targetDate) < toYMD(loss))) {
        hasValidInsurance = true;
      }
    }
    return hasValidInsurance;
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

  // 年齢到達月以降かどうか判定する関数を追加
  isAgeArrivedOrAfter(emp: any, year: number, month: number, targetAge: number): boolean {
    if (!emp.birthday) return false;
    const arrivalDates = getAllAgeArrivalDates(emp.birthday);
    const arrival = arrivalDates[targetAge];
    if (!arrival) return false;
    const targetDate = new Date(year, month - 1, 1);
    return targetDate >= arrival;
  }

  // 外国人特例の免除対象を国籍ごとに判定
  getSpecialExemptionType(emp: any): 'pension' | 'both' | null {
    if (!emp.isForeignWorker || !this.isSpecialExemption(emp)) return null;
    const code = emp.foreignWorker?.nationality;
    if (!code) return null;
    // 厚生年金のみ免除
    const pensionOnly = ['DE', 'KR', 'AU', 'BR', 'IN', 'CN', 'PH', 'SK', 'IE', 'IT'];
    // 厚生年金＋健康保険免除
    const both = ['US', 'BE', 'FR', 'NL', 'CZ', 'CH', 'HU', 'LU', 'SE', 'FI'];
    if (pensionOnly.includes(code)) return 'pension';
    if (both.includes(code)) return 'both';
    return null;
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

    // アラート用: 除外理由リスト
    const excludedReasons: string[] = [];

    // 追加: 給与データ未登録者チェック
    if (this.selectedType === 'salary') {
      const missingSalaryEmployees = targetEmployees.filter(emp => {
        if (!this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) return false;
        const salary = this.getSalaryForEmployee(emp.employeeId);
        return !salary || salary.totalSalary == null || salary.totalSalary === '';
      });
      if (missingSalaryEmployees.length > 0) {
        const names = missingSalaryEmployees.map(emp => `${this.offices.find(o => o.id === emp.officeId)?.name || ''} ${emp.lastName} ${emp.firstName}`).join('\n');
        excludedReasons.push(`当月給与データが登録されていない従業員:\n${names}`);
      }
    }

    // 共通の従業員filter
    const beforeFilterCount = targetEmployees.length;
    const filteredEmployees = targetEmployees.filter(emp => {
      // 入社前・退社後は対象外
      if (!this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) {
        excludedReasons.push(`${emp.lastName} ${emp.firstName}: 在籍期間外`);
        return false;
      }
      // 社会保険未加入は対象外
      if (!emp.healthInsuranceStatus?.isApplicable) {
        excludedReasons.push(`${emp.lastName} ${emp.firstName}: 社会保険未加入`);
        return false;
      }
      // 喪失日がある場合、対象年月の月末より前なら対象外
      const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
      if (lossDateRaw) {
        const lossDate = new Date(lossDateRaw);
        if (!isNaN(lossDate.getTime()) && lossDate < targetMonthEnd) {
          excludedReasons.push(`${emp.lastName} ${emp.firstName}: 喪失日が対象月より前`);
          return false;
        }
      }
      return true;
    });
    if (filteredEmployees.length === 0 && excludedReasons.length > 0) {
      alert('プレビューに表示できる従業員がいません。\n\n理由:\n' + excludedReasons.join('\n'));
      this.previewList = [];
      return;
    }
    targetEmployees = filteredEmployees;

    console.log('filteredEmployees:', filteredEmployees.map(e => e.employeeId));

    if (this.selectedType === 'salary') {
      this.previewList = targetEmployees
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

          // 外国人特例（国籍ごとに判定）
          const specialExemption = this.getSpecialExemptionType(emp);
          if (specialExemption === 'pension') {
            pensionApplicable = false;
          } else if (specialExemption === 'both') {
            pensionApplicable = false;
            healthApplicable = false;
          }

          // 年齢による資格喪失判定
          // 70歳到達月以降は厚生年金対象外
          if (AgeCheck.isPensionLostInMonth(emp, this.selectedYear, this.selectedMonth)) {
            pensionApplicable = false;
          } else if (this.isAgeArrivedOrAfter(emp, this.selectedYear, this.selectedMonth, 70)) {
            pensionApplicable = false;
          }

          // 75歳到達月以降は健康保険対象外
          if (AgeCheck.isHealthLostInMonth(emp, this.selectedYear, this.selectedMonth)) {
            healthApplicable = false;
          } else if (this.isAgeArrivedOrAfter(emp, this.selectedYear, this.selectedMonth, 75)) {
            healthApplicable = false;
          }

          // 65歳到達による介護保険資格喪失判定
          if (AgeCheck.isCareApplicableAge(emp, this.selectedYear, this.selectedMonth)) {
            careApplicable = true;
          }

          // 休業特例による免除（健康保険・厚生年金）
          if (isMaternityExempted || isChildcareExempted) {
            healthApplicable = false;
            pensionApplicable = false;
          }

          // 標準報酬月額の有効性チェック
          const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
          const rate = this.getInsuranceRateForOffice(emp.officeId);

          // 変数の初期化
          let careInsurance = '×';
          let healthInsurance = 'ー';
          let healthInsuranceDeduction = 'ー';
          let pension = 'ー';
          let pensionDeduction = 'ー';
          let deductionTotal = 'ー';
          let childcare = 'ー';
          let companyShare = 'ー';
          let grade = std ? `${std.healthGrade}（${std.pensionGrade}）` : 'ー';
          let monthly = std ? Number(std.healthMonthly).toLocaleString() : 'ー';
          let careRate = 0;
          let insuranceTotal = 0;
          let healthRate = 0;
          let pensionRate = 0;
          let childcareRate = 0;
          let prefectureName = '';
          let healthTotal = 0;
          let pensionTotal = 0;
          let childcareVal = 0;
          let healthDeduct = 0;
          let pensionDeduct = 0;
          let healthCompany = 0;
          let pensionCompany = 0;
          let isCare = false;


          // 必須項目の未入力チェック
          let missingReason = '';
          const missingCheck = checkEmployeeInputMissing(emp, std);
          if (missingCheck.missing && this.isActiveEmployeeForTargetMonth(emp, this.selectedYear, this.selectedMonth)) {
            this.missingStandardMonthlyEmployees.push({ ...emp, missingReason: missingCheck.reason });
          }
          const salary = this.getSalaryForEmployee(emp.employeeId);
         
          if (std && rate) {
            // 介護保険〇×表示を一度だけ判定
            const careInsuranceFlag = isCareInsuranceApplicableForDisplay(
              emp, std, rate, this.selectedYear, this.selectedMonth, healthApplicable, ymStr
            );
            careInsurance = careInsuranceFlag ? '〇' : '×';

            healthRate = rate.healthInsuranceRate || 0;
            careRate = careInsuranceFlag && rate.careInsuranceRate ? rate.careInsuranceRate : 0;
            let totalHealthRate = healthRate + careRate;
            pensionRate = rate.employeePensionInsuranceRate;
            childcareRate = Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE);

            healthTotal = InsuranceCalculator.calcHealthInsurance(std.healthMonthly, totalHealthRate, healthApplicable);
            healthDeduct = InsuranceCalculator.calcHealthInsuranceDeduction(healthTotal, healthApplicable);
            healthCompany = healthApplicable ? healthTotal - healthDeduct : 0;

            const pensionBaseAmount = std.pensionMonthly !== undefined && std.pensionMonthly !== null ? std.pensionMonthly : std.healthMonthly;
            pensionTotal = InsuranceCalculator.calcPensionInsurance(pensionBaseAmount, pensionRate, pensionApplicable);
            pensionDeduct = InsuranceCalculator.calcPensionDeduction(pensionTotal, pensionApplicable);
            pensionCompany = pensionApplicable ? pensionTotal - pensionDeduct : 0;

            childcareVal = InsuranceCalculator.calcChildcare(pensionBaseAmount, childcareRate, pensionApplicable);

            insuranceTotal = healthTotal + pensionTotal + childcareVal;
            healthInsurance = this.formatDecimal(healthTotal);
            healthInsuranceDeduction = healthDeduct.toLocaleString();
            pension = this.formatDecimal(pensionTotal);
            pensionDeduction = pensionDeduct.toLocaleString();
            childcare = this.formatDecimal(childcareVal);
            deductionTotal = (healthDeduct + pensionDeduct).toLocaleString();
            companyShare = this.formatDecimal(InsuranceCalculator.calcCompanyShare(healthCompany, pensionCompany, childcareVal));
            // 都道府県名
            const office = this.offices.find(o => o.id === emp.officeId);
            if (office && office.insurancePrefecture) {
              const pref = PREFECTURES.find(p => p.code === office.insurancePrefecture);
              prefectureName = pref ? pref.name : '';
            }
          }
          // 70歳厚生年金資格喪失月は徴収しない（この判定は一度だけ行う）
          if (AgeCheck.isPensionLostInMonth(emp, this.selectedYear, this.selectedMonth)) {
            pensionApplicable = false;
            childcare = '0';
          }
          // 75歳健康保険資格喪失月は徴収しない
          if (AgeCheck.isHealthLostInMonth(emp, this.selectedYear, this.selectedMonth)) {
            healthApplicable = false;
          }
          // 65歳介護保険資格喪失月は徴収しない
          if (AgeCheck.isCareApplicableAge(emp, this.selectedYear, this.selectedMonth)) {
            careApplicable = false;
          }
          // 年齢による資格喪失を金額に反映
          if (!healthApplicable) {
            healthInsurance = '0';
            healthInsuranceDeduction = '0';
            healthTotal = 0;
            healthDeduct = 0;
            healthCompany = 0;
          }
          if (!pensionApplicable) {
            pension = '0';
            pensionDeduction = '0';
            pensionTotal = 0;
            pensionDeduct = 0;
            pensionCompany = 0;
            childcare = '0'; // 70歳厚生年金免除時も拠出金免除
            childcareVal = 0;
          }
          // 控除合計・会社負担合計も資格喪失月は0円に
          if (!healthApplicable && !pensionApplicable) {
            deductionTotal = '0';
            companyShare = '0';
            childcare = '0';
            insuranceTotal = 0;
          } else {
            deductionTotal = (healthDeduct + pensionDeduct).toLocaleString();
            companyShare = this.formatDecimal(InsuranceCalculator.calcCompanyShare(healthCompany, pensionCompany, childcareVal));
            insuranceTotal = healthTotal + pensionTotal + childcareVal;
          }
          // ここで免除特例を取得
          const appliedExemptions = this.getAppliedExemptions(emp, this.selectedYear, this.selectedMonth);
          // 退職日・入社日による社会保険免除判定
          const exemptionResult = checkInsuranceExemption(emp, ymStr);
          if (exemptionResult.exemption) {
            // 免除の場合は各保険料を0円に
            // careInsurance = '×';
            healthInsurance = '0';
            healthInsuranceDeduction = '0';
            pension = '0';
            pensionDeduction = '0';
            deductionTotal = '0';
            childcare = '0';
            companyShare = '0';
            appliedExemptions.push(exemptionResult.exemptionType || '');
          } else if (exemptionResult.exemptionType === '同月得喪') {
            appliedExemptions.push('同月得喪');
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
            pensionMonthly: std && std.pensionMonthly !== undefined && std.pensionMonthly !== null
              ? Number(std.pensionMonthly)
              : (std ? Number(std.healthMonthly) : null),
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
      this.previewList = generateBonusPreviewList({
        employees: targetEmployees,
        bonuses: this.bonuses,
        standardMonthlyDecisions: this.standardMonthlyDecisions,
        offices: this.offices,
        insuranceRates: this.insuranceRates,
        selectedYear: this.selectedYear,
        selectedMonth: this.selectedMonth,
        excludeNoBonusEmployees: this.excludeNoBonusEmployees,
        getStandardMonthlyForEmployee: this.getStandardMonthlyForEmployee.bind(this),
        getBonusForEmployee: this.getBonusForEmployee.bind(this),
        getInsuranceRateForOffice: this.getInsuranceRateForOffice.bind(this),
        getAgeAtYearMonth1st: this.getAgeAtYearMonth1st.bind(this),
        isAgeArrivalInMonth: this.isAgeArrivalInMonth.bind(this),
        isMaternityLeaveExempted,
        isChildcareLeaveExempted,
        getAppliedExemptions: this.getAppliedExemptions.bind(this),
        formatDecimal: this.formatDecimal.bind(this),
        roundSocialInsurance: this.roundSocialInsurance.bind(this)
      });
    }
    // console.log('previewListに入る従業員:', this.previewList ? this.previewList.map(e => e.employeeName) : []);
    // 標準報酬・給与データ取得時
    targetEmployees.forEach(emp => {
      const std = this.getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
      // console.log(`標準報酬月額（${emp.lastName}${emp.firstName}）:`, std);
      const salary = this.getSalaryForEmployee(emp.employeeId);
      // console.log(`給与データ（${emp.lastName}${emp.firstName}）:`, salary);
    });
  }

  // 給与・賞与の計算結果保存処理
  async onSave() {
    const applyYearMonth = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // 標準報酬月額未登録従業員がいる場合は保存不可
    if (this.missingStandardMonthlyEmployees && this.missingStandardMonthlyEmployees.length > 0) {
      alert('有効な標準月額が登録されていない従業員がいます。\n有効な標準月額を登録する、または行を削除してから再度保存してください。');
      return;
    }
    // 当月データ存在チェック
    if (this.selectedType === 'salary') {
      // 既存給与計算結果の重複チェック
      const existingCalcs = this.insuranceSalaryCalculations.filter(s => s.applyYearMonth === applyYearMonth && s.companyKey === this.companyKey);
      const duplicateRows = this.previewList.filter(row =>
        existingCalcs.some(s => s.employeeId === row.employeeId && s.companyKey === this.companyKey)
      );
      if (duplicateRows.length > 0) {
        const names = duplicateRows.map(row => `${row.officeName} ${row.employeeName}`).join('\n');
        if (!confirm(`既に社会保険料計算結果が登録されている従業員がいます:\n${names}\n\n上書き保存しますか？`)) {
          return;
        }
        // 上書き保存
        const promises = this.previewList.map(async row => {
          const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceSalaryCalculation, 'createdAt' | 'updatedAt'> = {
            companyKey: this.companyKey,
            officeId: row.officeId,
            employeeId: row.employeeId,
            applyYearMonth,
            healthGrade: row.grade?.split('（')[0] || '',  // 健康保険等級のみ抽出
            healthMonthly: Number(row.monthly.toString().replace(/,/g, '')),
            pensionGrade: row.grade?.split('（')[1]?.replace('）', '') || '',  // 厚生年金等級のみ抽出
            pensionMonthly: row.pensionMonthly,
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
          await this.firestoreService.updateInsuranceSalaryCalculation(calculation);
        });
        await Promise.all(promises);
        alert(`${this.previewList.length}件の給与社会保険料計算結果を上書き保存しました。`);
        this.router.navigate(['/insurance-calc']);
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
          healthGrade: row.grade?.split('（')[0] || '',  // 健康保険等級のみ抽出
          healthMonthly: Number(row.monthly.toString().replace(/,/g, '')),
          pensionGrade: row.grade?.split('（')[1]?.replace('）', '') || '',  // 厚生年金等級のみ抽出
          pensionMonthly: row.pensionMonthly,
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
      alert(`${this.previewList.length}件の給与社会保険料計算結果を保存しました。`);
      this.router.navigate(['/insurance-calc']);
    } else if (this.selectedType === 'bonus') {
      // 対象月に賞与データが未登録の従業員を抽出
      const missingBonusEmployees = this.previewList.filter(row => !row.bonus || row.bonus === 'ー');
      if (missingBonusEmployees.length > 0) {
        const names = missingBonusEmployees.map(row => `${row.officeName} ${row.employeeName}`).join('\n');
        alert(`当月賞与データが登録されていない従業員がいます:\n${names}`);
        return;
      }
      // 既存賞与計算結果の重複チェック
      const existingCalcs = this.insuranceBonusCalculations.filter(s => s.applyYearMonth === applyYearMonth && s.companyKey === this.companyKey);
      const duplicateRows = this.previewList.filter(row =>
        existingCalcs.some(s => s.employeeId === row.employeeId && s.companyKey === this.companyKey)
      );
      if (duplicateRows.length > 0) {
        const names = duplicateRows.map(row => `${row.officeName} ${row.employeeName}`).join('\n');
        if (!confirm(`既に賞与社会保険料計算結果が登録されている従業員がいます:\n${names}\n\n上書き保存しますか？`)) {
          return;
        }
        // 上書き保存
        const promises = this.previewList.map(async row => {
          const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceBonusCalculation, 'createdAt' | 'updatedAt'> = {
            companyKey: this.companyKey,
            officeId: row.officeId,
            employeeId: row.employeeId,
            applyYearMonth,
            healthGrade: row.grade?.split('（')[0] || '',  // 健康保険等級のみ抽出
            healthMonthly: Number(row.monthly.toString().replace(/,/g, '')),
            pensionGrade: row.grade?.split('（')[1]?.replace('）', '') || '',  // 厚生年金等級のみ抽出
            pensionMonthly: row.pensionMonthly,
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
            annualBonusTotal: row.annualBonusTotal ?? 0,
            annualBonusTotalBefore: row.annualBonusTotalBefore ?? 0,
            bonusDiff: row.bonusDiff ?? 0,
          };
          await this.firestoreService.updateInsuranceBonusCalculation(calculation);
        });
        await Promise.all(promises);
        alert(`${this.previewList.length}件の賞与社会保険料計算結果を上書き保存しました。`);
        this.router.navigate(['/insurance-calc']);
        return;
      }
      const promises = this.previewList.map(async row => {
        const calculation: Omit<import('../../../../core/models/insurance-calculation.model').InsuranceBonusCalculation, 'createdAt' | 'updatedAt'> = {
          companyKey: this.companyKey,
          officeId: row.officeId,
          employeeId: row.employeeId,
          applyYearMonth,
          healthGrade: row.grade?.split('（')[0] || '',  // 健康保険等級のみ抽出
          healthMonthly: Number(row.monthly.toString().replace(/,/g, '')),
          pensionGrade: row.grade?.split('（')[1]?.replace('）', '') || '',  // 厚生年金等級のみ抽出
          pensionMonthly: row.pensionMonthly,
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
          annualBonusTotal: row.annualBonusTotal ?? 0,
          annualBonusTotalBefore: row.annualBonusTotalBefore ?? 0,
          bonusDiff: row.bonusDiff ?? 0,
        };
        await this.firestoreService.addInsuranceBonusCalculation(calculation);
      });
      await Promise.all(promises);
      alert(`${this.previewList.length}件の賞与社会保険料計算結果を保存しました。`);
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
      // missingStandardMonthlyEmployeesからも削除
      this.missingStandardMonthlyEmployees = this.missingStandardMonthlyEmployees.filter(emp => emp.employeeId !== row.employeeId);
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
      // missingStandardMonthlyEmployeesからも削除
      this.missingStandardMonthlyEmployees = this.missingStandardMonthlyEmployees.filter(emp => emp.employeeId !== row.employeeId);
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
    // 産休（給与のみ表示）
    if (this.selectedType === 'salary' && isMaternityLeaveExempted(emp, ymStr)) {
      result.push('産前産後休業免除');
    }
    // 育休
    if (isChildcareLeaveExempted(emp, ymStr)) {
      result.push('育児休業免除');
    }
    // 外国人特例
    const specialExemption = this.getSpecialExemptionType(emp);
    if (specialExemption === 'pension') {
      result.push('外国人特例（厚生年金免除）');
    } else if (specialExemption === 'both') {
      result.push('外国人特例（厚生年金・健康保険免除）');
    }
    // 年齢による資格喪失
    const ageArrival = this.isAgeArrivalInMonth(emp, year, month);
    if (AgeCheck.isPensionLostInMonth(emp, year, month)) {
      result.push('厚生年金：70歳到達月（前日）による資格喪失');
    } else if (this.isAgeArrivedOrAfter(emp, year, month, 70)) {
      result.push('厚生年金：70歳到達月以降による資格喪失');
    }
    if (AgeCheck.isHealthLostInMonth(emp, year, month)) {
      result.push('健康保険：75歳到達月（当日）による資格喪失');
    } else if (this.isAgeArrivedOrAfter(emp, year, month, 75)) {
      result.push('健康保険：75歳到達月以降による資格喪失');
    }
    if (AgeCheck.isCareApplicableAge(emp, year, month)) {
      result.push('介護保険：65歳到達月（前日）による資格喪失');
    } else if (this.isAgeArrivedOrAfter(emp, year, month, 65)) {
      result.push('介護保険：65歳到達月以降による資格喪失');
    }
    return result;
  }

  // 40歳介護保険適用開始月判定（1日生まれ特例対応）
  isCareInsuranceApplicableInMonth(emp: any, year: number, month: number): boolean {
    if (!emp.birthday) return false;
    const birth = new Date(emp.birthday);
    const careStartDate = new Date(birth.getFullYear() + 40, birth.getMonth(), birth.getDate() - 1); // 40歳誕生日の前日
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    // 誕生日が1日の場合は、前日も同じ年齢として扱い、前日が属する月から適用
    if (birth.getDate() === 1) {
      // 例：7月1日生まれ→6月分から適用
      return careStartDate <= monthEnd;
    }
    // 通常判定
    return careStartDate <= monthEnd;
  }

  get activeOffices() {
    return this.offices.filter(o => o.isActive !== false);
  }
}

