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

  currentUser: AppUser | null = null;

  editMode = false;
  editingDecisionId: string | null = null;
  decisionToEdit: any = null;

  // 算出根拠入力用
  calculationRows: any[] = [];

  get totalSum() {
    return this.calculationRows.filter(row => !row.excluded).reduce((acc, row) => acc + (row.sum || 0), 0);
  }
  get average() {
    const includedRows = this.calculationRows.filter(row => !row.excluded);
    return includedRows.length > 0 ? Math.round(this.totalSum / includedRows.length) : 0;
  }
  get modifiedAverage() {
    // 修正平均額も同様に対象外を除外して計算（現状は手動入力欄なので、必要ならここで自動計算も可）
    const includedRows = this.calculationRows.filter(row => !row.excluded);
    return includedRows.length > 0 ? Math.round(this.totalSum / includedRows.length) : 0;
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
      console.log(`[generateCalculationRows] ym: ${ym}, salary:`, salary, 'inKind:', inKind, 'inKindRetro:', inKindRetro);
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
    private route: ActivatedRoute
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
    this.isConfirmed = true;
    this.decisionType = decision.type;
  }

  getEmployeeName(employeeId: string): string {
    const emp = this.employees.find(e => e.employeeId === employeeId);
    return emp ? emp.lastName + ' ' + emp.firstName : '';
  }

  getCurrentDecisionForEmployee(employeeId: string, officeId: string): StandardMonthlyDecision | null {
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    // console.log('currentYm:', currentYm, 'employeeId:', employeeId, 'officeId:', officeId);
    const candidates = this.standardMonthlyDecisions
      .filter(r =>
        r.employeeId === employeeId &&
        r.officeId === officeId &&
        r.applyYearMonth <= currentYm
      )
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
    // console.log('candidates:', candidates);
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

  // 決定ボタン押下時
  async onDecision() {
    if (!this.selectedEmployeeId) {
      alert('従業員を選択してください');
      return;
    }
    if (this.decisionType === 'entry') {
      this.onEntryDecision();
      this.isConfirmed = false;
      return;
    }
    // 決定時：支払い基礎日数自動計算
    const emp = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    console.log('選択従業員:', emp);
    if (emp) {
      console.log('emp.employeeType:', emp.employeeType);
    }
    // パート・アルバイトの場合は勤怠から取得
    if (emp && (emp.employeeType === 'parttime' || emp.employeeType === 'parttimejob')) {
      this.calculationRows.forEach((row, idx) => {
        // 勤怠データから該当月のactualWorkDaysを取得（employeeId, year, monthをすべて文字列で比較）
        const att = this.attendances.find(a => String(a.employeeId) === String(emp.employeeId) && String(a.year) === String(row.year) && String(a.month) === String(row.month));
        console.log(`【${row.year}年${row.month}月】attendance:`, att);
        if (att) {
          console.log(`actualWorkDays:`, att.actualWorkDays);
        } else {
          console.log('attendanceデータが見つかりません');
        }
        row.days = att && att.actualWorkDays != null ? att.actualWorkDays : 0;
      });
    } else if (emp && (emp.employeeType === 'regular' || emp.employeeType === 'contract')) {
      const office = this.offices.find(o => o.id === emp.officeId);
      console.log('従業員のoffice:', office);
      const closingDay = office && office.salaryClosingDate ? Number(office.salaryClosingDate) : null;
      console.log('salaryClosingDate:', closingDay);
      if (closingDay && this.calculationRows.length > 0) {
        this.calculationRows.forEach((row, idx) => {
          const year = row.year;
          const month = row.month;
          let prevYear = month === 1 ? year - 1 : year;
          let prevMonth = month === 1 ? 12 : month - 1;
          const fromDate = new Date(prevYear, prevMonth - 1, closingDay + 1);
          const toDate = new Date(year, month - 1, closingDay);
          const diff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
          console.log(`【${year}年${month}月】from:`, fromDate, 'to:', toDate, 'diff:', diff);
          row.days = diff;
        });
        console.log('calculationRows after days set:', this.calculationRows);
      }
    }
    // 定時決定・随時改定など
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeId === this.selectedEmployeeId);
    }
    // 社会保険適用者のみ対象
    filteredEmployees = filteredEmployees.filter(emp => emp.healthInsuranceStatus?.isApplicable);
    // 定時決定のみ：6月1日以降の資格取得者、6月30日以前の退職/喪失者を除外
    const year = this.startYear;
    const june1 = new Date(`${year}-06-01`);
    const june30 = new Date(`${year}-06-30`);
    filteredEmployees = filteredEmployees.filter(emp => {
      // 社会保険資格取得日
      const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
      if (acqDateRaw) {
        const acqDate = new Date(acqDateRaw);
        if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
          return false; // 6/1以降に資格取得→対象外
        }
      }
      // 契約終了日
      if (emp.contractEndDate) {
        const endDate = new Date(emp.contractEndDate);
        if (!isNaN(endDate.getTime()) && endDate <= june30) {
          return false; // 6/30以前に退職→対象外
        }
      }
      // 社会保険喪失日
      const lossDateRaw = emp.healthInsuranceStatus?.lossDate;
      if (lossDateRaw) {
        const lossDate = new Date(lossDateRaw);
        if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
          return false; // 6/30以前に喪失→対象外
        }
      }
      return true;
    });
    // 2. 期間指定（YYYY-MM形式の文字列で比較）
    const fromYm = `${this.salaryFromYear}-${String(this.salaryFromMonth).padStart(2, '0')}`;
    const toYm = `${this.salaryToYear}-${String(this.salaryToMonth).padStart(2, '0')}`;
    // 3. 各従業員ごとに期間内の給与データを集計
    this.resultList = filteredEmployees.map(emp => {
      // 1. 給与データの抽出
      let salaryList = this.salaries.filter((sal: any) => {
        return sal.employeeId === emp.employeeId &&
          sal.targetYearMonth >= fromYm &&
          sal.targetYearMonth <= toYm;
      });
      // 通勤手当を月割りで分配して加算
      const salaryMap = this.distributeCommuteAllowance(salaryList, fromYm, toYm);
      // 2. 契約開始日が4月1日～5月31日か判定
      if (emp.contractStartDate) {
        const start = new Date(emp.contractStartDate);
        const startYear = start.getFullYear();
        const startMonth = start.getMonth() + 1; // 1月=0
        if (
          startYear === this.salaryFromYear &&
          (startMonth === 4 || startMonth === 5)
        ) {
          // 3. 契約開始月の給与データがある場合
          const ym = `${start.getFullYear()}-${String(startMonth).padStart(2, '0')}`;
          if (salaryMap[ym] !== undefined) {
            // 4. 契約開始日から月末までの日数を計算
            const lastDay = new Date(start.getFullYear(), startMonth, 0).getDate();
            const days = lastDay - start.getDate() + 1;
            if (days < 17) {
              // 5. 17日未満ならその月の給与を除外
              salaryMap[ym] = 0;
            }
          }
        }
      }
      // 追加: 4月・5月・6月の給与金額
      const aprilYm = `${this.salaryFromYear}-04`;
      const mayYm = `${this.salaryFromYear}-05`;
      const juneYm = `${this.salaryFromYear}-06`;
      const aprilSalary = salaryMap[aprilYm] ?? null;
      const maySalary = salaryMap[mayYm] ?? null;
      const juneSalary = salaryMap[juneYm] ?? null;
      // 算定に利用した月
      const usedMonthsArr: string[] = [];
      if (salaryMap[aprilYm]) usedMonthsArr.push('4');
      if (salaryMap[mayYm]) usedMonthsArr.push('5');
      if (salaryMap[juneYm]) usedMonthsArr.push('6');
      const usedMonths = usedMonthsArr.join(',');
      // 6. 残ったsalaryMapで合計・平均を算出
      const salaryValues = Object.values(salaryMap).filter(v => v > 0);
      const salaryTotal = salaryValues.reduce((sum: number, s: number) => sum + s, 0);
      const salaryAvg = salaryValues.length > 0 ? Math.round(salaryTotal / salaryValues.length) : 0;
      const office = this.offices.find((o: any) => o.id === emp.officeId);
      const insuranceType = office && office.insuranceType ? office.insuranceType : '1';
      const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
      const healthGrades = this.standardMonthlyGrades.filter((grade: any) => {
        return grade.gradeType === 'health' &&
          grade.insuranceType === insuranceType &&
          grade.validFrom <= applyYm &&
          (!grade.validTo || grade.validTo >= applyYm);
      });
      const matchedHealthGrade = healthGrades.find((grade: any) => {
        if (grade.upperLimit == null || grade.upperLimit === '') {
          return grade.lowerLimit <= salaryAvg;
        }
        return grade.lowerLimit <= salaryAvg && salaryAvg < grade.upperLimit;
      });
      const judgedGrade = matchedHealthGrade ? matchedHealthGrade.grade : '';
      const judgedMonthly = matchedHealthGrade ? matchedHealthGrade.compensation : 0;
      const pensionGrades = this.standardMonthlyGrades.filter((grade: any) => {
        return grade.gradeType === 'pension' &&
          grade.insuranceType === insuranceType &&
          grade.validFrom <= applyYm &&
          (!grade.validTo || grade.validTo >= applyYm);
      });
      const matchedPensionGrade = pensionGrades.find((grade: any) => {
        if (grade.upperLimit == null || grade.upperLimit === '') {
          return grade.lowerLimit <= salaryAvg;
        }
        return grade.lowerLimit <= salaryAvg && salaryAvg < grade.upperLimit;
      });
      const pensionJudgedGrade = matchedPensionGrade ? matchedPensionGrade.grade : '';
      const pensionJudgedMonthly = matchedPensionGrade ? matchedPensionGrade.compensation : 0;
      return {
        employeeId: emp.employeeId,
        officeId: emp.officeId,
        employeeName: emp.lastName + ' ' + emp.firstName,
        currentGrade: emp.grade || '',
        currentMonthly: emp.monthly || 0,
        aprilSalary,
        maySalary,
        juneSalary,
        usedMonths,
        salaryTotal,
        salaryAvg,
        judgedGrade,
        judgedMonthly,
        pensionJudgedGrade,
        pensionJudgedMonthly
      };
    });
    this.isConfirmed = true;
  }

  // 行修正ボタン（現状はダミー）
  onEditRow(index: number) {
    // 必要に応じて編集用ダイアログ等を実装
    alert(`${this.resultList[index].employeeName} の修正ボタンが押されました`);
  }

  // 保存ボタン押下時
  async onSave() {
    const applyYearMonth = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const isEntry = this.decisionType === 'entry';
    const userId = this.currentUser?.uid || '';
    const userName = this.currentUser?.displayName || '';
    if (this.editMode && this.editingDecisionId) {
      const row = this.resultList[0];
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
          dec.type === 'fixed'
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
    }
    // 今後、typeごとの初期化やバリデーション切り替えなどをここで実装
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

    // // 3. 現在有効な標準報酬月額が未登録の従業員のみ
    // const today = new Date();
    // const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    // filteredEmployees = filteredEmployees.filter(emp => {
    //   const hasCurrentDecision = this.standardMonthlyDecisions.some(dec =>
    //     dec.employeeId === emp.employeeId &&
    //     dec.officeId === emp.officeId &&
    //     dec.applyYearMonth <= currentYm
    //   );
    //   return !hasCurrentDecision;
    // });

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
      alert('対象の従業員が存在しません。');
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

  get filteredEmployeesForSummary(): any[] {
    let filtered = this.employees;
    if (this.selectedOfficeId) {
      filtered = filtered.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    return filtered;
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

  // 随時改定用：判定処理
  async onOccasionalDecision() {
    // 定時決定と同様のロジックを流用
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeId === this.selectedEmployeeId);
    }
    // 社会保険適用者のみ対象
    filteredEmployees = filteredEmployees.filter(emp => emp.healthInsuranceStatus?.isApplicable);
    // 期間指定
    const fromYm = `${this.salaryFromYear}-${String(this.salaryFromMonth).padStart(2, '0')}`;
    const toYm = `${this.salaryToYear}-${String(this.salaryToMonth).padStart(2, '0')}`;
    this.resultList = filteredEmployees.map(emp => {
      let salaryList = this.salaries.filter((sal: any) => {
        return sal.employeeId === emp.employeeId &&
          sal.targetYearMonth >= fromYm &&
          sal.targetYearMonth <= toYm;
      });
      // 通勤手当を月割りで分配して加算
      const salaryMap = this.distributeCommuteAllowance(salaryList, fromYm, toYm);
      // 4月・5月・6月の給与金額
      const aprilYm = `${this.salaryFromYear}-04`;
      const mayYm = `${this.salaryFromYear}-05`;
      const juneYm = `${this.salaryFromYear}-06`;
      const aprilSalary = salaryMap[aprilYm] ?? null;
      const maySalary = salaryMap[mayYm] ?? null;
      const juneSalary = salaryMap[juneYm] ?? null;
      // 算定に利用した月
      const usedMonthsArr: string[] = [];
      if (salaryMap[aprilYm]) usedMonthsArr.push('4');
      if (salaryMap[mayYm]) usedMonthsArr.push('5');
      if (salaryMap[juneYm]) usedMonthsArr.push('6');
      const usedMonths = usedMonthsArr.join(',');
      // 合計・平均
      const salaryValues = Object.values(salaryMap).filter(v => v > 0);
      const salaryTotal = salaryValues.reduce((sum: number, s: number) => sum + s, 0);
      const salaryAvg = salaryValues.length > 0 ? Math.round(salaryTotal / salaryValues.length) : 0;
      const office = this.offices.find((o: any) => o.id === emp.officeId);
      const insuranceType = office && office.insuranceType ? office.insuranceType : '1';
      const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
      const healthGrades = this.standardMonthlyGrades.filter((grade: any) => {
        return grade.gradeType === 'health' &&
          grade.insuranceType === insuranceType &&
          grade.validFrom <= applyYm &&
          (!grade.validTo || grade.validTo >= applyYm);
      });
      const matchedHealthGrade = healthGrades.find((grade: any) => {
        if (grade.upperLimit == null || grade.upperLimit === '') {
          return grade.lowerLimit <= salaryAvg;
        }
        return grade.lowerLimit <= salaryAvg && salaryAvg < grade.upperLimit;
      });
      const judgedGrade = matchedHealthGrade ? matchedHealthGrade.grade : '';
      const judgedMonthly = matchedHealthGrade ? matchedHealthGrade.compensation : 0;
      const pensionGrades = this.standardMonthlyGrades.filter((grade: any) => {
        return grade.gradeType === 'pension' &&
          grade.insuranceType === insuranceType &&
          grade.validFrom <= applyYm &&
          (!grade.validTo || grade.validTo >= applyYm);
      });
      const matchedPensionGrade = pensionGrades.find((grade: any) => {
        if (grade.upperLimit == null || grade.upperLimit === '') {
          return grade.lowerLimit <= salaryAvg;
        }
        return grade.lowerLimit <= salaryAvg && salaryAvg < grade.upperLimit;
      });
      const pensionJudgedGrade = matchedPensionGrade ? matchedPensionGrade.grade : '';
      const pensionJudgedMonthly = matchedPensionGrade ? matchedPensionGrade.compensation : 0;
      return {
        employeeId: emp.employeeId,
        officeId: emp.officeId,
        employeeName: emp.lastName + ' ' + emp.firstName,
        currentGrade: emp.grade || '',
        currentMonthly: emp.monthly || 0,
        aprilSalary,
        maySalary,
        juneSalary,
        usedMonths,
        salaryTotal,
        salaryAvg,
        judgedGrade,
        judgedMonthly,
        pensionJudgedGrade,
        pensionJudgedMonthly
      };
    });
    this.isConfirmed = true;
  }

  // 随時改定用：保存処理
  async onSaveOccasional() {
    const applyYearMonth = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const userId = this.currentUser?.uid || '';
    const userName = this.currentUser?.displayName || '';
    try {
      const alreadyRegistered: string[] = [];
      for (const row of this.resultList) {
        const emp = this.employees.find(e => `${e.lastName} ${e.firstName}` === row.employeeName);
        const exists = this.standardMonthlyDecisions.some(dec =>
          dec.employeeId === (emp ? emp.employeeId : '') &&
          dec.applyYearMonth === applyYearMonth &&
          dec.type === 'occasional'
        );
        if (exists) {
          alreadyRegistered.push(`${row.employeeName} の ${this.startYear}年${this.startMonth}月適用には既に随時改定データが登録されています。`);
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
          salaryTotal: row.salaryTotal ?? 0,
          salaryAvg: row.salaryAvg ?? 0,
          type: 'occasional',
          aprilSalary: row.aprilSalary ?? null,
          maySalary: row.maySalary ?? null,
          juneSalary: row.juneSalary ?? null,
          usedMonths: row.usedMonths ?? '',
          isActive: true
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
      alert('随時改定データの保存が完了しました');
      this.router.navigate(['/manage-standard-monthly']);
      this.isConfirmed = false;
    } catch (error: any) {
      alert('保存に失敗しました: ' + (error?.message || error));
    }
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

  get filteredEmployeesByOffice() {
    if (!this.selectedOfficeId) return this.employeesSortedByIdName;
    return this.employeesSortedByIdName.filter(emp => emp.officeId === this.selectedOfficeId);
  }

  onOfficeChange() {
    // 事業所変更時に従業員選択をリセット
    this.selectedEmployeeId = '';
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
    if (!this.selectedEmployeeId) return null;
    // 事業所IDが選択されていればそれで絞り込むが、未選択なら従業員IDのみで取得
    let filtered = this.standardMonthlyDecisions.filter(r => r.employeeId === this.selectedEmployeeId);
    if (this.selectedOfficeId) {
      filtered = filtered.filter(r => r.officeId === this.selectedOfficeId);
    }
    return filtered.sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth))[0] || null;
  }

  get hasNextDecision(): boolean {
    if (!this.selectedEmployeeId) return false;
    const current = this.currentDecision;
    if (!current) return false;
    // 事業所IDが選択されていればそれで絞り込むが、未選択なら従業員IDのみで判定
    return this.standardMonthlyDecisions.some(r =>
      r.employeeId === this.selectedEmployeeId &&
      (!this.selectedOfficeId || r.officeId === this.selectedOfficeId) &&
      r.applyYearMonth > current.applyYearMonth
    );
  }
}
