import { Component, OnInit } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StandardMonthlyDecision, StandardMonthlyDecisionType, STANDARD_MONTHLY_DECISION_TYPES, STANDARD_MONTHLY_DECISION_TYPE_LABELS } from '../../../../core/models/standard-monthly-decision .model';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { EMPLOYEE_TYPES, EmployeeType } from '../../../../core/models/employee.type';
import { AppUser } from '../../../../core/models/user.model';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';
import { StandardMonthlyCheckService } from '../../../../core/services/standard.monthly.check.service';

@Component({
  selector: 'app-standard-monthly-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './standard-monthly-form.component.html',
  styleUrl: './standard-monthly-form.component.css'
})
export class StandardMonthlyFormComponent implements OnInit {
  companyKey: string = '';
  companyId: string = '';
  companyName: string = '';
  offices: any[] = [];
  employees: any[] = [];
  salaries: any[] = [];
  standardMonthlyGrades: any[] = [];
  standardMonthlyDecisions: StandardMonthlyDecision[] = [];
  attendances: any[] = [];

  // フォーム用バインド変数
  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  startYear: number = 2025;
  startMonth: number = 9;
  salaryFromYear: number = 2025;
  salaryFromMonth: number = 4;
  salaryToYear: number = 2025;
  salaryToMonth: number = 6;

  // 判定結果リスト
  resultList: any[] = [];

  // 決定種別選択用
  decisionTypes = STANDARD_MONTHLY_DECISION_TYPES;
  decisionType: StandardMonthlyDecisionType = 'fixed';
  decisionTypeLabels = STANDARD_MONTHLY_DECISION_TYPE_LABELS;

  employeeTypes: EmployeeType[] = EMPLOYEE_TYPES;

  isConfirmed = false;

  isCalculated = false;

  currentUser: AppUser | null = null;


  editMode = false;
  editingDecisionId: string | null = null;
  decisionToEdit: any = null;

  // 算出根拠入力用
  calculationRows: any[] = [];

  attentionMessages: string[] = [];

  get totalSum() {
    return this.calculationRows.filter(row => !row.excluded).reduce((acc, row) => acc + (row.sum || 0), 0);
  }
  get average() {
    const includedRows = this.calculationRows.filter(row => !row.excluded);
    return includedRows.length > 0 ? Math.round(this.totalSum / includedRows.length) : 0;
  }
  get modifiedAverage() {
    const includedRows = this.calculationRows.filter(row => !row.excluded);
    if (includedRows.length === 0) return 0;
    // 遡及分の合計
    const totalRetro = includedRows.reduce((sum, row) => sum + (Number(row.inKindRetro) || 0), 0);
    // 総計から遡及分を引いた値で平均を算出
    const modifiedTotal = this.totalSum - totalRetro;
    return Math.round(modifiedTotal / includedRows.length);
  }

  // 指定した期間の月リストを生成
  private generateCalculationRows() {
    const rows = [];
    let year = this.salaryFromYear;
    let month = this.salaryFromMonth;
    while (year < this.salaryToYear || (year === this.salaryToYear && month <= this.salaryToMonth)) {
      // 対象年月の給与データを取得
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      const salary = this.salaries.find(s => s.targetYearMonth === ym && (!this.selectedEmployeeId || s.employeeId === this.selectedEmployeeId));
      const inKind = salary ? (salary.totalInKind || 0) : 0;
      const inKindRetro = salary ? (salary.totalRetro || 0) : 0;
      rows.push({
        year,
        month,
        days: 0,
        cash: 0,
        cashRetro: 0,
        inKind,
        inKindRetro,
        sum: 0,
        excluded: false
      });
      month++;
      if (month > 12) {
        year++;
        month = 1;
      }
    }
    this.calculationRows = rows;
  }

  updateRowSum(i: number) {
    const row = this.calculationRows[i];
    row.sum = Number(row.cash || 0) + Number(row.cashRetro || 0) + Number(row.inKind || 0) + Number(row.inKindRetro || 0);
  }

  // 算出根拠期間が変わったら自動でcalculationRowsを再生成
  onSalaryPeriodChange() {
    this.generateCalculationRows();
  }

  onSaveCalculation() {
    // 保存処理をここに実装
    alert('保存しました（ダミー）');
  }

  // チェック項目用
  checkItems: boolean[] = Array(10).fill(false);
  otherCheckText: string = '';

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService,
    private router: Router,
    private route: ActivatedRoute,
    private standardMonthlyCheckService: StandardMonthlyCheckService
  ) {}

  async ngOnInit() {
    this.userCompanyService.user$.subscribe(user => {
      this.currentUser = user;
    });
    this.route.queryParamMap.subscribe(async params => {
      const mode = params.get('mode');
      const decisionId = params.get('decisionId');
      if (mode === 'edit' && decisionId) {
        this.editMode = true;
        this.editingDecisionId = decisionId;
        const decision = await this.firestoreService.getStandardMonthlyDecisionById(decisionId);
        if (decision) {
          this.decisionToEdit = decision;
        }
      }
    });
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.companyId = company!.companyId;
        this.companyName = company!.name;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        this.salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
        const grades = await firstValueFrom(this.firestoreService.getStandardMonthlyGrades());
        this.standardMonthlyGrades = grades || [];
        this.standardMonthlyDecisions = await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey);
        this.attendances = await this.firestoreService.getAttendancesByCompanyKey(this.companyKey);
        if (this.editMode && this.decisionToEdit) {
          this.setFormForEdit(this.decisionToEdit);
        }
        this.generateCalculationRows();
      });
  }

  setFormForEdit(decision: any) {
    const emp = this.employees.find(e => e.employeeId === decision.employeeId);
    const office = this.offices.find(o => o.id === decision.officeId);
    this.selectedOfficeId = decision.officeId;
    this.selectedEmployeeId = decision.employeeId;
    this.startYear = Number(decision.applyYearMonth.split('-')[0]);
    this.startMonth = Number(decision.applyYearMonth.split('-')[1]);
    this.salaryFromYear = this.startYear;
    this.salaryToYear = this.startYear;
    this.resultList = [{
      ...decision,
      employeeName: emp
        ? emp.lastName + ' ' + emp.firstName
        : (decision.lastName && decision.firstName
            ? decision.lastName + ' ' + decision.firstName
            : decision.employeeId),
      officeName: office ? office.name : decision.officeId,
      judgedGrade: decision.healthGrade,
      judgedMonthly: decision.healthMonthly,
      pensionJudgedGrade: decision.pensionGrade,
      pensionJudgedMonthly: decision.pensionMonthly
    }];
    this.decisionType = decision.type;
  }

  getEmployeeName(employeeId: string): string {
    const emp = this.employees.find(e => e.employeeId === employeeId);
    return emp ? emp.lastName + ' ' + emp.firstName : '';
  }

  getCurrentDecisionForEmployee(employeeId: string, officeId: string): StandardMonthlyDecision | null {
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const candidates = this.standardMonthlyDecisions
      .filter(r =>
        r.employeeId === employeeId &&
        r.officeId === officeId &&
        r.applyYearMonth <= currentYm
      )
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
    return candidates[0] || null;
  }

  // 対象期間内の各月に通勤手当を分配するユーティリティ関数
  private distributeCommuteAllowance(salaries: any[], fromYm: string, toYm: string): { [ym: string]: number } {
    // fromYm, toYm: 'YYYY-MM' 形式
    const salaryMap: { [ym: string]: number } = {};
    let ym = fromYm;
    while (ym <= toYm) {
      salaryMap[ym] = 0;
      ym = this.nextYm(ym);
    }
    for (const sal of salaries) {
      // 通常の給与合計
      if (salaryMap[sal.targetYearMonth] !== undefined) {
        salaryMap[sal.targetYearMonth] += (sal.basicSalary || 0) + (sal.overtimeSalary || 0) + (sal.otherAllowance || 0) + (sal.totalAllowance || 0);
      }
      // 通勤手当の分配
      if (sal.commuteAllowance && sal.commuteAllowanceMonths && sal.commuteAllowancePeriodFrom && sal.commuteAllowancePeriodTo) {
        const months = sal.commuteAllowanceMonths;
        const monthlyCommute = sal.commuteAllowance / months;
        let commuteYm = sal.commuteAllowancePeriodFrom;
        for (let i = 0; i < months; i++) {
          if (salaryMap[commuteYm] !== undefined) {
            salaryMap[commuteYm] += monthlyCommute;
          }
          commuteYm = this.nextYm(commuteYm);
        }
      }
    }
    return salaryMap;
  }

  // '2024-04' → '2024-05' のように次の月を返す
  private nextYm(ym: string): string {
    const [year, month] = ym.split('-').map(Number);
    if (month === 12) {
      return `${year + 1}-01`;
    } else {
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    }
  }

  onEmployeeInfo() {
    if (!this.selectedEmployeeId) {
      alert('従業員を選択してください');
      return;
    }
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    if (!emp) {
      alert('従業員情報はありません。');
      return;
    }
    const office = this.offices.find(o => o.id === emp.officeId);
    // 年齢計算
    let age: string = '-';
    if (emp.birthday) {
      const birth = new Date(emp.birthday);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let ageNum = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          ageNum--;
        }
        age = String(ageNum);
      }
    }
    const info = [
      `【従業員情報】`,
      `氏名: ${emp.lastName ?? ''} ${emp.firstName ?? ''}`,
      `従業員番号: ${emp.employeeId ?? '-'}`,
      `年齢: ${age}`,
      `所属事業所: ${office ? office.name : emp.officeId ?? '-'}`,
      `雇用区分: ${emp.employeeType ?? '-'}`,
      `入社日: ${emp.joinDate ?? '-'}`,
      `退職日: ${emp.contractEndDate ?? '-'}`,
      `健康保険: ${emp.healthInsuranceStatus?.isApplicable ? '加入' : '未加入'}`,
      `厚生年金: ${emp.pensionStatus?.isApplicable ? '加入' : '未加入'}`,
      `介護保険: ${emp.isCareInsuranceApplicable ? '対象' : '対象外'}`,
      `備考: ${emp.remarks ?? '-'}`
    ].join('\n');
    alert(info);
  }

  onAttendanceInfo(year: number, month: number) {
    if (!this.selectedEmployeeId) {
      alert('従業員を選択してください');
      return;
    }
    const att = this.attendances.find(a => String(a.employeeId) === String(this.selectedEmployeeId) && String(a.year) === String(year) && String(a.month) === String(month));
    // calculationRowsから該当年月の支払い基礎日数を取得
    const calcRow = this.calculationRows.find(r => Number(r.year) === Number(year) && Number(r.month) === Number(month));
    const baseDays = calcRow ? calcRow.days : undefined;
    if (!att) {
      alert(`${year}年${month}月の勤怠情報はありません。` + (baseDays !== undefined ? `\n支払い基礎日数: ${baseDays} 日` : ''));
      return;
    }
    // 表示内容を整形
    const info = [
      `【${year}年${month}月の勤怠情報】`,
      `支払い基礎日数: ${baseDays !== undefined ? baseDays : '-'} 日`,
      `所定労働日数: ${att.scheduledWorkDays ?? '-'} 日`,
      `所定労働時間: ${att.scheduledWorkHours ?? '-'} 時間`,
      `実際の労働時間: ${att.actualWorkHours ?? '-'} 時間`,
      `出勤日数: ${att.actualWorkDays ?? '-'} 日`,
      `欠勤日数: ${att.absenceDays ?? '-'} 日`,
      `無給休暇日数: ${att.leaveWithoutPayDays ?? '-'} 日`,
      `有給日数: ${att.paidLeaveDays ?? '-'} 日`,
      `休暇特例日数: ${att.holidaySpecialDays ?? '-'} 日`,
      `育児休業開始日: ${att.childCareLeaveStartDate ?? '-'}`,
      `育児休業終了日: ${att.childCareLeaveEndDate ?? '-'}`,
      `備考: ${att.remarks ?? '-'} `
    ].join('\n');
    alert(info);
  }

  onSalaryInfo(year: number, month: number) {
    if (!this.selectedEmployeeId) {
      alert('従業員を選択してください');
      return;
    }
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const salary = this.salaries.find(s => s.employeeId === this.selectedEmployeeId && s.targetYearMonth === ym);
    if (!salary) {
      alert(`${year}年${month}月の給与情報はありません。`);
      return;
    }
    // 0円表示用ヘルパー
    const yen = (v: any) => (v != null && v !== '') ? `${Number(v).toLocaleString()} 円` : '0 円';
    const num = (v: any) => (v != null && v !== '') ? v : '0';
    const info = [
      `【${year}年${month}月の給与情報】`,
      `支給日: ${salary.paymentDate ?? '-'}`,
      `基本給: ${yen(salary.basicSalary)}`,
      `時間外手当: ${yen(salary.overtimeSalary)}`,
      `通勤手当: ${yen(salary.commuteAllowance)}`,
      `通勤手当月数: ${num(salary.commuteAllowanceMonths)} ヶ月`,
      `役職手当: ${yen(salary.positionAllowance)}`,
      `その他手当合計: ${yen(salary.totalOtherAllowance)}`,
      `現物支給合計: ${yen(salary.totalInKind)}`,
      `遡及手当合計: ${yen(salary.totalRetro)}`,
      `実費精算合計: ${yen(salary.totalActualExpense)}`,
      `総支給額: ${yen(salary.totalSalary)}`
    ].join('\n');
    alert(info);
  }

  private isFixedDecisionTarget(emp: any): boolean {
    if (!emp.healthInsuranceStatus?.isApplicable) return false;
    const year = this.startYear;
    const june1 = new Date(`${year}-06-01`);
    const june30 = new Date(`${year}-06-30`);
    // 6/1以降の資格取得者は除外
    const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
    if (acqDateRaw) {
      const acqDate = new Date(acqDateRaw);
      if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
        return false;
      }
    }
    // 6/30以前の退職者
    if (emp.contractEndDate) {
      const endDate = new Date(emp.contractEndDate);
      if (!isNaN(endDate.getTime()) && endDate <= june30) {
        return false;
      }
    }
    // 6/30以前の喪失者
    const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
    if (lossDateRaw) {
      const lossDate = new Date(lossDateRaw);
      if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
        return false;
      }
    }
    return true;
  }

  // 決定ボタン押下時
  async onDecision() {
    if (!this.selectedEmployeeId) {
      alert('従業員を選択してください');
      return;
    }
    // 契約開始年月チェック
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    if (emp && emp.contractStartDate) {
      const contractDate = new Date(emp.contractStartDate);
      if (!isNaN(contractDate.getTime())) {
        const contractYm = `${contractDate.getFullYear()}-${String(contractDate.getMonth() + 1).padStart(2, '0')}`;
        if (applyYm < contractYm) {
          alert('適用開始年月が契約開始年月より前になっています。適用開始年月を正しく設定してください。');
          return;
        }
      }
    }
    // 算出根拠年月が適用対象年月より未来の場合のチェック
    const salaryFromYm = `${this.salaryFromYear}-${String(this.salaryFromMonth).padStart(2, '0')}`;
    const salaryToYm = `${this.salaryToYear}-${String(this.salaryToMonth).padStart(2, '0')}`;
    if (salaryFromYm > applyYm || salaryToYm > applyYm) {
      alert('算出根拠年月が適用対象年月より未来になっています。算出根拠年月を正しく設定してください。');
      return;
    }
    if (emp && !this.isFixedDecisionTarget(emp)) {
      if (!confirm('定時算定の非対象者が選択されています。続けて操作をしますか？')) {
        return;
      }
    }
    if (this.decisionType === 'entry') {
      this.onEntryDecision();
      this.isConfirmed = false;
      this.isCalculated = false;
      return;
    }
    // 1. 日数自動計算
    this.autoSetDaysForCalculationRows();
    // 2. 対象従業員フィルタ
    let filteredEmployees = this.filterEmployeesForDecision();
    // 3. 通貨欄用：各月の給与（totalSalary）をセット
    if (this.selectedEmployeeId) {
      this.calculationRows.forEach((row, i) => {
        row.cash = this.getTotalSalaryForEmployeeAndPeriod(this.selectedEmployeeId, row.year, row.month);
        row.inKind = this.getInKindTotalForEmployee(this.selectedEmployeeId, row.year, row.month);
        row.inKindRetro = this.getRetroTotalForEmployee(this.selectedEmployeeId, row.year, row.month);
        this.updateRowSum(i);
        row.modifiedAverage = this.modifiedAverage;
      });
    }
    // 追加: 注意喚起メッセージ生成
    this.attentionMessages = this.standardMonthlyCheckService.generateAttentionMessages(
      this.salaries,
      [], // bonusesは現状未取得のため空配列、必要に応じて取得
      this.calculationRows,
      emp,
      this.decisionType,
      `${this.salaryFromYear}-${String(this.salaryFromMonth).padStart(2, '0')}`,
      `${this.salaryToYear}-${String(this.salaryToMonth).padStart(2, '0')}`
    );
    this.isConfirmed = true;
  }

  // 共通：選択従業員・期間で給与情報を取得
  private getSalaryListForSelectedEmployeeAndPeriod(employeeId: string): any[] {
    const ymList: string[] = [];
    let year = this.salaryFromYear;
    let month = this.salaryFromMonth;
    while (year < this.salaryToYear || (year === this.salaryToYear && month <= this.salaryToMonth)) {
      ymList.push(`${year}-${String(month).padStart(2, '0')}`);
      month++;
      if (month > 12) {
        year++;
        month = 1;
      }
    }
    return this.salaries.filter(s => s.employeeId === employeeId && ymList.includes(s.targetYearMonth));
  }

  // 通貨欄用：選択従業員・年月の給与情報からtotalSalaryを取得
  private getTotalSalaryForEmployeeAndPeriod(employeeId: string, year: number, month: number): number {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const salary = this.salaries.find(s => s.employeeId === employeeId && s.targetYearMonth === ym);
    if (!salary) return 0;

    // 基本給
    const basic = Number(salary.basicSalary) || 0;
    // 時間外手当
    const overtime = Number(salary.overtimeSalary) || 0;
    // 通勤手当
    const commute = Number(salary.commuteAllowance) || 0;
    // 役職手当
    const position = Number(salary.positionAllowance) || 0;
    // その他手当
    const otherAllowance = Number(salary.totalOtherAllowance) || 0;
    // 実費精算
    const actualExpense = Number(salary.totalActualExpense) || 0;

    // 現金支給額 = 基本給 + 時間外手当 + 通勤手当 + 役職手当 + その他手当 + 実費精算
    // （現物給与と遡及は除く）
    return basic + overtime + commute + position + otherAllowance + actualExpense;
  }

  // 現物：選択従業員・年月の給与情報からtotalInKindを取得
  private getInKindTotalForEmployee(employeeId: string, year: number, month: number): number {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const salary = this.salaries.find(s => s.employeeId === employeeId && s.targetYearMonth === ym);
    return salary ? (salary.totalInKind || 0) : 0;
  }

  // 遡及：選択従業員・年月の給与情報からtotalRetroを取得
  private getRetroTotalForEmployee(employeeId: string, year: number, month: number): number {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const salary = this.salaries.find(s => s.employeeId === employeeId && s.targetYearMonth === ym);
    return salary ? (salary.totalRetro || 0) : 0;
  }

  // 日数自動計算処理
  private autoSetDaysForCalculationRows() {
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    if (!emp) return;
    if (emp.employeeType === 'parttime' || emp.employeeType === 'parttimejob') {
      this.calculationRows.forEach((row, idx) => {
        const att = this.attendances.find(a => String(a.employeeId) === String(emp.employeeId) && String(a.year) === String(row.year) && String(a.month) === String(row.month));
        row.days = att && att.actualWorkDays != null ? att.actualWorkDays : 0;
      });
    } else if (emp.employeeType === 'regular' || emp.employeeType === 'contract') {
      const office = this.offices.find(o => o.id === emp.officeId);
      const closingDay = office && office.salaryClosingDate ? Number(office.salaryClosingDate) : null;
      if (closingDay && this.calculationRows.length > 0) {
        this.calculationRows.forEach((row, idx) => {
          const year = row.year;
          const month = row.month;
          let prevYear = month === 1 ? year - 1 : year;
          let prevMonth = month === 1 ? 12 : month - 1;
          const fromDate = new Date(prevYear, prevMonth - 1, closingDay + 1);
          const toDate = new Date(year, month - 1, closingDay);
          const diff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
          row.days = diff;
        });
      }
    }
  }

  // 対象従業員フィルタ処理
  private filterEmployeesForDecision() {
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeId === this.selectedEmployeeId);
    }
    filteredEmployees = filteredEmployees.filter(emp => emp.healthInsuranceStatus?.isApplicable);
    const year = this.startYear;
    const june1 = new Date(`${year}-06-01`);
    const june30 = new Date(`${year}-06-30`);
    filteredEmployees = filteredEmployees.filter(emp => {
      const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
      if (acqDateRaw) {
        const acqDate = new Date(acqDateRaw);
        if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
          return false;
        }
      }
      if (emp.contractEndDate) {
        const endDate = new Date(emp.contractEndDate);
        if (!isNaN(endDate.getTime()) && endDate <= june30) {
          return false;
        }
      }
      const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
      if (lossDateRaw) {
        const lossDate = new Date(lossDateRaw);
        if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
          return false;
        }
      }
      return true;
    });
    return filteredEmployees;
  }

  // 選択中の従業員からofficeIdを取得する
  private getOfficeIdForSelectedEmployee(): string {
    if (this.selectedEmployeeId) {
      const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
      return emp?.officeId || '';
    }
    return '';
  }

  // チェックリストの選択状態を取得するメソッド
  getChecklistState(): { [key: number]: boolean; otherText: string } {
    const state: { [key: number]: boolean; otherText: string } = { otherText: this.otherCheckText };
    for (let i = 1; i <= 9; i++) {
      state[i] = !!this.checkItems[i];
    }
    return state;
  }

  // 算定ボタン押下時
  onStandardMonthlyDecision() {
    this.isConfirmed = true;
    const officeId = this.selectedOfficeId || this.getOfficeIdForSelectedEmployee();
    if (!this.selectedEmployeeId || !officeId) return;
    const avg = this.modifiedAverage;
    const office = this.offices.find((o: any) => o.id === officeId);
    const insuranceType = office && office.insuranceType ? office.insuranceType : '1';
    const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const health = this.judgeStandardMonthlyGrade(avg, 'health', insuranceType, applyYm);
    const pension = this.judgeStandardMonthlyGrade(avg, 'pension', insuranceType, applyYm);

    const current = this.currentDecision;
    const currentHealthGrade = current ? current.healthGrade : '';
    const currentPensionGrade = current ? current.pensionGrade : '';
    const currentHealthMonthly = current ? current.healthMonthly : 0;

    // チェックリストの選択状態を取得
    const checklistState = this.getChecklistState();
    // 算定根拠（calculationRows）も保存
    const calculationRowsCopy = JSON.parse(JSON.stringify(this.calculationRows));

    this.resultList = [{
      employeeId: this.selectedEmployeeId,
      officeId: officeId,
      employeeName: this.employees.find(e => e.employeeId === this.selectedEmployeeId)?.lastName + ' ' + this.employees.find(e => e.employeeId === this.selectedEmployeeId)?.firstName,
      currentGrade: `${currentHealthGrade}（${currentPensionGrade}）`,
      currentMonthly: currentHealthMonthly,
      salaryAvg: avg,
      judgedGrade: health.grade,
      judgedMonthly: health.compensation,
      pensionJudgedGrade: pension.grade,
      pensionJudgedMonthly: pension.compensation,
      checklist: checklistState,
      calculationRows: calculationRowsCopy
    }];
    this.isCalculated = true;
  }

  // 等級判定：与えられた値に対して標準報酬月額グレードから等級・月額を返す
  private judgeStandardMonthlyGrade(value: number, gradeType: 'health' | 'pension', insuranceType: string, applyYm: string): { grade: string, compensation: number } {
    const grades = this.standardMonthlyGrades.filter((grade: any) => {
      return grade.gradeType === gradeType &&
        grade.insuranceType === insuranceType &&
        grade.validFrom <= applyYm &&
        (!grade.validTo || grade.validTo >= applyYm);
    });
    const matchedGrade = grades.find((grade: any) => {
      if (grade.upperLimit == null || grade.upperLimit === '') {
        return grade.lowerLimit <= value;
      }
      return grade.lowerLimit <= value && value < grade.upperLimit;
    });
    return {
      grade: matchedGrade ? matchedGrade.grade : '',
      compensation: matchedGrade ? matchedGrade.compensation : 0
    };
  }

  // aggregateSalaryDataForEmployeeを分割・整理
  private aggregateSalaryDataForEmployee(emp: any) {
    // 1. 通貨欄用：給与合計
    const totalSalary = this.getTotalSalaryForEmployeeAndPeriod(emp.employeeId, this.startYear, this.startMonth);
    // 2. 契約開始日取得（判定のみ残す）
    const contractStartDate = emp.contractStartDate ? new Date(emp.contractStartDate) : null;
    // 3. 等級判定（judgeStandardMonthlyGradeで一元化）
    const office = this.offices.find((o: any) => o.id === emp.officeId);
    const insuranceType = office && office.insuranceType ? office.insuranceType : '1';
    const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const healthResult = this.judgeStandardMonthlyGrade(totalSalary, 'health', insuranceType, applyYm);
    const pensionResult = this.judgeStandardMonthlyGrade(totalSalary, 'pension', insuranceType, applyYm);
    return {
      employeeId: emp.employeeId,
      officeId: emp.officeId,
      employeeName: emp.lastName + ' ' + emp.firstName,
      currentGrade: emp.grade || '',
      currentMonthly: emp.monthly || 0,
      contractStartDate,
      totalSalary,
      judgedGrade: healthResult.grade,
      judgedMonthly: healthResult.compensation,
      pensionJudgedGrade: pensionResult.grade,
      pensionJudgedMonthly: pensionResult.compensation
    };
  }

  /**
   * 保存ボタンクリック時の処理
   */
  onSave(): void {
    // 随時改定の等級差チェック
    if (this.decisionType === 'occasional' && this.resultList && this.resultList.length > 0) {
      const current = this.currentDecision;
      const newGrade = this.resultList[0].judgedGrade;
      if (current && current.healthGrade && newGrade) {
        // 等級を数値化して比較（数字以外はパース不可なのでNumberで）
        const currentNum = Number(current.healthGrade);
        const newNum = Number(newGrade);
        if (!isNaN(currentNum) && !isNaN(newNum)) {
          const diff = Math.abs(newNum - currentNum);
          if (diff < 2) {
            if (!confirm('新しい等級は現在の等級から2等級以上離れていません。このまま保存しますか？')) {
              return;
            }
          }
        }
      }
    }
    if (this.decisionType === 'entry') {
      this.saveEntryDecision();
    } else {
      this.saveStandardMonthlyDecision();
    }
  }

  /**
   * 入社時決定の保存
   */
  private async saveEntryDecision(): Promise<void> {
    if (!this.resultList || this.resultList.length === 0) return;

    const result = this.resultList[0];
    // 従業員のofficeIdを必ずセット
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    const officeId = emp ? emp.officeId : this.selectedOfficeId;
    const data = {
      companyId: this.companyId,
      companyKey: this.companyKey,
      employeeId: this.selectedEmployeeId,
      officeId: officeId,
      decisionType: this.decisionType,
      type: this.decisionType,
      applyYearMonth: `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`,
      estimatedSalary: {
        baseSalary: result.estimatedBaseSalary || 0,
        overtime: result.estimatedOvertime || 0,
        commute: result.estimatedCommute || 0,
        positionAllowance: result.estimatedPositionAllowance || 0,
        otherAllowance: result.estimatedOtherAllowance || 0,
        inKind: result.estimatedInKind || 0,
        total: result.estimatedTotal || 0
      },
      healthGrade: result.judgedGrade,
      healthMonthly: result.judgedMonthly,
      pensionGrade: result.pensionJudgedGrade,
      pensionMonthly: result.pensionJudgedMonthly,
      salaryAvg: result.estimatedTotal || 0,
      salaryTotal: result.estimatedTotal || 0,
      isActive: true,
      createdAt: new Date()
    };

    try {
      // 履歴保存
      await this.firestoreService.addStandardMonthlyDecisionHistory(data);
      // 本体保存
      await this.firestoreService.addStandardMonthlyDecision(data);
      alert('保存が完了しました。');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました。');
    }
  }

  /**
   * 定時決定などの保存（既存のメソッドをリネーム）
   */
  private async saveStandardMonthlyDecision(): Promise<void> {
    const applyYearMonth = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const isEntry = this.decisionType === 'entry';
    const userId = this.currentUser?.uid || '';
    const userName = this.currentUser?.displayName || '';
    // 異常値チェック
    const row = this.resultList[0];
    const abnormal =
      (row.judgedMonthly <= 0 || row.judgedMonthly >= 1000000) ||
      (row.pensionJudgedMonthly <= 0 || row.pensionJudgedMonthly >= 1000000) ||
      (row.salaryAvg <= 0 || row.salaryAvg >= 1000000);
    if (abnormal) {
      if (!confirm('標準報酬月額または平均月額が異常な値です。本当に保存しますか？')) {
        return;
      }
    }
    if (this.editMode && this.editingDecisionId) {
      const decision = {
        companyKey: this.companyKey,
        officeId: this.selectedOfficeId,
        employeeId: this.selectedEmployeeId,
        applyYearMonth,
        healthGrade: row.judgedGrade ?? row.healthGrade,
        healthMonthly: row.judgedMonthly ?? row.healthMonthly,
        pensionGrade: row.pensionJudgedGrade ?? row.pensionGrade,
        pensionMonthly: row.pensionJudgedMonthly ?? row.pensionMonthly,
        salaryTotal: isEntry ? row.estimatedTotal : row.salaryTotal ?? 0,
        salaryAvg: isEntry ? row.estimatedTotal : row.salaryAvg ?? 0,
        type: isEntry ? 'entry' : row.type ?? 'fixed',
        aprilSalary: row.aprilSalary ?? null,
        maySalary: row.maySalary ?? null,
        juneSalary: row.juneSalary ?? null,
        usedMonths: row.usedMonths ?? '',
        isActive: true,
        checklist: row.checklist,
        calculationRows: row.calculationRows,
        ...(isEntry && {
          estimatedBaseSalary: row.estimatedBaseSalary ?? 0,
          estimatedOvertime: row.estimatedOvertime ?? 0,
          estimatedCommute: row.estimatedCommute ?? 0,
          estimatedPositionAllowance: row.estimatedPositionAllowance ?? 0,
          estimatedOtherAllowance: row.estimatedOtherAllowance ?? 0,
          estimatedInKind: row.estimatedInKind ?? 0,
          estimatedTotal: row.estimatedTotal ?? 0
        })
      };
      await this.firestoreService.updateStandardMonthlyDecisionWithHistory(
        decision, userId, userName
      );
      alert('編集内容を保存しました');
      this.router.navigate(['/manage-standard-monthly']);
      return;
    }
    try {
      // 既存データ該当者をリストアップ
      const alreadyRegistered: string[] = [];
      for (const row of this.resultList) {
        const emp = this.employees.find(e => `${e.lastName} ${e.firstName}` === row.employeeName);
        const exists = this.standardMonthlyDecisions.some(dec =>
          dec.employeeId === (emp ? emp.employeeId : '') &&
          dec.applyYearMonth === applyYearMonth &&
          dec.type === 'fixed' &&
          dec.isActive === true
        );
        if (exists) {
          alreadyRegistered.push(`${row.employeeName} の ${this.startYear}年${this.startMonth}月適用には既に標準報酬月額が登録されています。`);
        }
      }
      if (alreadyRegistered.length > 0) {
        alert(alreadyRegistered.join('\n'));
        return;
      }
      const promises = this.resultList.map(async row => {
        const emp = this.employees.find(e => `${e.lastName} ${e.firstName}` === row.employeeName);
        const officeId = emp ? emp.officeId : '';
        const decision: Omit<StandardMonthlyDecision, 'createdAt' | 'updatedAt'> = {
          companyKey: this.companyKey,
          officeId: officeId,
          employeeId: emp ? emp.employeeId : '',
          applyYearMonth,
          healthGrade: row.judgedGrade,
          healthMonthly: row.judgedMonthly,
          pensionGrade: row.pensionJudgedGrade,
          pensionMonthly: row.pensionJudgedMonthly,
          salaryTotal: isEntry ? row.estimatedTotal : row.salaryTotal ?? 0,
          salaryAvg: isEntry ? row.estimatedTotal : row.salaryAvg ?? 0,
          type: isEntry ? 'entry' : 'fixed',
          aprilSalary: row.aprilSalary ?? null,
          maySalary: row.maySalary ?? null,
          juneSalary: row.juneSalary ?? null,
          usedMonths: row.usedMonths ?? '',
          isActive: true,
          checklist: row.checklist,
          calculationRows: row.calculationRows,
          ...(isEntry && {
            estimatedBaseSalary: row.estimatedBaseSalary ?? 0,
            estimatedOvertime: row.estimatedOvertime ?? 0,
            estimatedCommute: row.estimatedCommute ?? 0,
            estimatedPositionAllowance: row.estimatedPositionAllowance ?? 0,
            estimatedOtherAllowance: row.estimatedOtherAllowance ?? 0,
            estimatedInKind: row.estimatedInKind ?? 0,
            estimatedTotal: row.estimatedTotal ?? 0
          })
        };
        // 履歴保存
        await this.firestoreService.addStandardMonthlyDecisionHistory({
          ...decision,
          operationType: 'create',
          operationAt: new Date(),
          operatedByUserId: userId,
          operatedByUserName: userName
        });
        // 本体保存
        await this.firestoreService.addStandardMonthlyDecision(decision);
      });
      await Promise.all(promises);
      alert('保存が完了しました');
      this.router.navigate(['/manage-standard-monthly']);
      this.isConfirmed = false;
      this.isCalculated = false;
    } catch (error: any) {
      alert('保存に失敗しました: ' + (error?.message || error));
    }
  }

  // 定時決定：適用開始月・決定種別変更時に自動設定
  setFixedDecisionPeriod() {
    this.startMonth = 9;
    this.salaryFromMonth = 4;
    this.salaryToMonth = 6;
    this.salaryFromYear = this.startYear;
    this.salaryToYear = this.startYear;
  }

  onFixedStartMonthChange() {
    if (this.decisionType === 'fixed') {
      this.setFixedDecisionPeriod();
    }
  }

  onDecisionTypeChange() {
    // 決定種別変更時の初期化
    if (this.decisionType === 'fixed') {
      this.setFixedDecisionPeriod();
      this.isConfirmed = false;
      this.isCalculated = false;
    }
    // 今後、typeごとの初期化やバリデーション切り替えなどをここで実装
  }

  onEmployeeChange() {
    console.log('selectedEmployeeId:', this.selectedEmployeeId);
    this.isConfirmed = false;
    this.isCalculated = false;
  }

  // 入社時決定用：見込み報酬入力リスト生成
  onEntryDecision() {
    // 1. 事業所・従業員区分でフィルタ
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeId === this.selectedEmployeeId);
    }

    // 2. 資格取得日の年月（YYYY-MM）と適用開始年月が一致する従業員のみ
    const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    filteredEmployees = filteredEmployees.filter(emp => {
      const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
      if (!acqDateRaw) return false;
      const acqDate = new Date(acqDateRaw);
      if (isNaN(acqDate.getTime())) return false;
      const acqYm = `${acqDate.getFullYear()}-${String(acqDate.getMonth() + 1).padStart(2, '0')}`;
      return acqYm === applyYm;
    });


    // 4. リスト生成
    this.resultList = filteredEmployees.map(emp => ({
      employeeId: emp.employeeId,
      officeId: emp.officeId,
      employeeName: emp.lastName + ' ' + emp.firstName,
      estimatedBaseSalary: 0,
      estimatedOvertime: 0,
      estimatedCommute: 0,
      estimatedPositionAllowance: 0,
      estimatedOtherAllowance: 0,
      estimatedInKind: 0,
      estimatedTotal: 0,
      judgedGrade: '',
      judgedMonthly: 0,
      pensionJudgedGrade: '',
      pensionJudgedMonthly: 0,
      isCareInsuranceApplicable: false
    }));
    if (this.resultList.length === 0) {
      alert('選択した対象年月に入社の従業員ではありません。');
    }
    this.isConfirmed = false;
  }

  // 入力値変更時：合計・等級自動判定
  onEstimatedSalaryChange(row: any, i: number) {
    // 合計計算
    const total =
      Number(row.estimatedBaseSalary || 0) +
      Number(row.estimatedOvertime || 0) +
      Number(row.estimatedCommute || 0) +
      Number(row.estimatedPositionAllowance || 0) +
      Number(row.estimatedOtherAllowance || 0) +
      Number(row.estimatedInKind || 0);
    row.estimatedTotal = total;
    // 等級自動判定
    const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const office = this.offices.find((o: any) => o.id === row.officeId);
    const insuranceType = office && office.insuranceType ? office.insuranceType : '1';
    // 健康保険等級
    const healthGrades = this.standardMonthlyGrades.filter((grade: any) => {
      return grade.gradeType === 'health' &&
        grade.insuranceType === insuranceType &&
        grade.validFrom <= applyYm &&
        (!grade.validTo || grade.validTo >= applyYm);
    });
    const matchedHealthGrade = healthGrades.find((grade: any) => {
      if (grade.upperLimit == null || grade.upperLimit === '') {
        return grade.lowerLimit <= total;
      }
      return grade.lowerLimit <= total && total < grade.upperLimit;
    });
    row.judgedGrade = matchedHealthGrade ? matchedHealthGrade.grade : '';
    row.judgedMonthly = matchedHealthGrade ? matchedHealthGrade.compensation : 0;
    // 厚生年金等級
    const pensionGrades = this.standardMonthlyGrades.filter((grade: any) => {
      return grade.gradeType === 'pension' &&
        grade.insuranceType === insuranceType &&
        grade.validFrom <= applyYm &&
        (!grade.validTo || grade.validTo >= applyYm);
    });
    const matchedPensionGrade = pensionGrades.find((grade: any) => {
      if (grade.upperLimit == null || grade.upperLimit === '') {
        return grade.lowerLimit <= total;
      }
      return grade.lowerLimit <= total && total < grade.upperLimit;
    });
    row.pensionJudgedGrade = matchedPensionGrade ? matchedPensionGrade.grade : '';
    row.pensionJudgedMonthly = matchedPensionGrade ? matchedPensionGrade.compensation : 0;
    // 反映
    this.resultList[i] = { ...row };
  }

  onConfirmEstimated() {
    // 入力済みの見込み報酬額から等級・月額を自動判定
    this.resultList.forEach((row, i) => this.onEstimatedSalaryChange(row, i));
    this.isConfirmed = true;
  }

  getOfficeName(officeId: string): string {
    const office = this.offices.find(o => o.id === officeId);
    return office ? office.name : '';
  }

  get filteredEmployeesByOffice() {
    if (!this.selectedOfficeId) return this.employeesSortedByIdName.filter(emp => isEmployeeSelectable(emp, this.startYear?.toString(), this.startMonth?.toString()));
    return this.employeesSortedByIdName.filter(emp => emp.officeId === this.selectedOfficeId && isEmployeeSelectable(emp, this.startYear?.toString(), this.startMonth?.toString()));
  }

  get filteredEmployeesForSummary(): any[] {
    let filtered = this.employees;
    if (this.selectedOfficeId) {
      filtered = filtered.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    return filtered.filter(emp => isEmployeeSelectable(emp, this.startYear?.toString(), this.startMonth?.toString()));
  }

  // 社会保険加入者数
  get healthInsuranceMemberCount(): number {
    return this.filteredEmployeesForSummary.filter(emp => emp.healthInsuranceStatus?.isApplicable).length;
  }

  // 社会保険非加入者数
  get healthInsuranceNotMemberCount(): number {
    return this.filteredEmployeesForSummary.filter(emp => !emp.healthInsuranceStatus?.isApplicable).length;
  }

  // 定時決定対象者数（社会保険加入者のうち、定時決定のフィルタ条件を満たす者）
  get fixedDecisionTargetCount(): number {
    // 年度・月情報
    const year = this.startYear;
    const june1 = new Date(`${year}-06-01`);
    const june30 = new Date(`${year}-06-30`);
    return this.filteredEmployeesForSummary.filter(emp => {
      if (!emp.healthInsuranceStatus?.isApplicable) return false;
      // 6/1以降の資格取得者は除外
      const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
      if (acqDateRaw) {
        const acqDate = new Date(acqDateRaw);
        if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
          return false;
        }
      }
      // 6/30以前の退職者
      if (emp.contractEndDate) {
        const endDate = new Date(emp.contractEndDate);
        if (!isNaN(endDate.getTime()) && endDate <= june30) {
          return false;
        }
      }
      // 6/30以前の喪失者
      const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
      if (lossDateRaw) {
        const lossDate = new Date(lossDateRaw);
        if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
          return false;
        }
      }
      return true;
    }).length;
  }

  // 定時決定非対象者数（社会保険加入者のうち、定時決定のフィルタ条件を満たさない者）
  get fixedDecisionNotTargetCount(): number {
    // 年度・月情報
    const year = this.startYear;
    const june1 = new Date(`${year}-06-01`);
    const june30 = new Date(`${year}-06-30`);
    return this.filteredEmployeesForSummary.filter(emp => {
      if (!emp.healthInsuranceStatus?.isApplicable) return false;
      // 6/1以降の資格取得者
      const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
      if (acqDateRaw) {
        const acqDate = new Date(acqDateRaw);
        if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
          return true;
        }
      }
      // 6/30以前の退職者
      if (emp.contractEndDate) {
        const endDate = new Date(emp.contractEndDate);
        if (!isNaN(endDate.getTime()) && endDate <= june30) {
          return true;
        }
      }
      // 6/30以前の喪失者
      const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
      if (lossDateRaw) {
        const lossDate = new Date(lossDateRaw);
        if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
          return true;
        }
      }
      // いずれにも該当しなければ対象者
      return false;
    }).length;
  }

  get employeesSortedByIdName() {
    return [...this.employees].sort((a, b) => {
      const aKey = `${a.employeeId}${a.lastName}${a.firstName}`;
      const bKey = `${b.employeeId}${b.lastName}${b.firstName}`;
      return aKey.localeCompare(bKey, 'ja');
    });
  }

  onRemoveRow(index: number) {
    const name = this.resultList[index]?.employeeName || '';
    if (!confirm(`${name} を一括登録から削除します。よろしいですか？`)) {
      return;
    }
    this.resultList.splice(index, 1);
  }

  

  

  // 随時改定：適用開始月変更時に算出根拠月を自動設定
  onOccasionalStartMonthChange() {
    // 適用開始月の前3ヶ月を算出
    let toYear = this.startYear;
    let toMonth = this.startMonth - 1;
    if (toMonth === 0) {
      toYear--;
      toMonth = 12;
    }
    let fromYear = toYear;
    let fromMonth = toMonth - 2;
    if (fromMonth <= 0) {
      fromYear--;
      fromMonth += 12;
    }
    this.salaryFromYear = fromYear;
    this.salaryFromMonth = fromMonth;
    this.salaryToYear = toYear;
    this.salaryToMonth = toMonth;
  }

  async onDelete() {
    if (!confirm('本当に削除しますか？')) return;
    const row = this.resultList[0];
    const decision = {
      companyKey: this.companyKey,
      officeId: this.selectedOfficeId,
      employeeId: this.selectedEmployeeId,
      applyYearMonth: `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`,
      ...row,
      isActive: false
    };
    await this.firestoreService.deleteStandardMonthlyDecisionWithHistory(
      decision, this.currentUser?.uid || '', this.currentUser?.displayName || ''
    );
    alert('削除しました');
    this.router.navigate(['/manage-standard-monthly']);
  }

 
  onOfficeChange() {
    // 事業所変更時に従業員選択をリセット
    this.selectedEmployeeId = '';
    this.isConfirmed = false;
    this.isCalculated = false;
  }

  get selectedEmployeeTypeName(): string {
    if (!this.selectedEmployeeId) return '';
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    if (!emp) return '';
    const type = this.employeeTypes.find(t => t.code === emp.employeeType);
    return type ? type.name : emp.employeeType || '';
  }

  get selectedEmployeeHealthInsuranceApplicable(): boolean {
    if (!this.selectedEmployeeId) return false;
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    return !!emp?.healthInsuranceStatus?.isApplicable;
  }

  get selectedEmployeeCareInsuranceApplicable(): boolean {
    if (!this.selectedEmployeeId) return false;
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    return !!emp?.isCareInsuranceApplicable;
  }

  get selectedEmployeePensionApplicable(): boolean {
    if (!this.selectedEmployeeId) return false;
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    return !!emp?.pensionStatus?.isApplicable;
  }

  get currentDecision() {
    if (this.editMode && this.decisionToEdit) {
      return this.decisionToEdit;
    }
    if (!this.selectedEmployeeId) return null;
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let filtered = this.standardMonthlyDecisions.filter(r =>
      r.employeeId === this.selectedEmployeeId &&
      r.applyYearMonth <= currentYm
    );
    if (this.selectedOfficeId) {
      filtered = filtered.filter(r => r.officeId === this.selectedOfficeId);
    }
    return filtered.sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth))[0] || null;
  }

  get nextDecision() {
    if (this.editMode && this.decisionToEdit) {
      return this.decisionToEdit;
    }
    if (!this.selectedEmployeeId) return null;
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let filtered = this.standardMonthlyDecisions.filter(r =>
      r.employeeId === this.selectedEmployeeId &&
      r.applyYearMonth > currentYm
    );
    if (this.selectedOfficeId) {
      filtered = filtered.filter(r => r.officeId === this.selectedOfficeId);
    }
    return filtered.sort((a, b) => a.applyYearMonth.localeCompare(b.applyYearMonth))[0] || null;
  }

  // 金額調整用の＋－ボタン処理
  adjustValue(row: any, key: 'cash' | 'inKind' | 'inKindRetro', value: number, i: number) {
    if (!value || isNaN(value)) return;
    row[key] = Number(row[key] || 0) + value;
    this.updateRowSum(i);
    // 調整用インプットをリセット
    if (key === 'cash') row.adjustCash = '';
    if (key === 'inKind') row.adjustInKind = '';
    if (key === 'inKindRetro') row.adjustInKindRetro = '';
  }
}


