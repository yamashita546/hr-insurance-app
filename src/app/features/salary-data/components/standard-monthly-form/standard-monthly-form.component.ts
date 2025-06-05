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
import { Router ,RouterModule } from '@angular/router';
import { EMPLOYEE_TYPES, EmployeeType } from '../../../../core/models/employee.type';

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

  // フォーム用バインド変数
  selectedOfficeId: string = '';
  selectedEmployeeType: string = '';
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
        this.companyId = company!.companyId;
        this.companyName = company!.name;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        console.log('従業員データ:', this.employees);
        this.salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
        console.log('取得した給与データ:', this.salaries);
        const grades = await firstValueFrom(this.firestoreService.getStandardMonthlyGrades());
        console.log('Firestoreから取得したgrades:', grades);
        this.standardMonthlyGrades = grades || [];
        console.log('this.standardMonthlyGradesセット直後:', this.standardMonthlyGrades);
        // 標準報酬月額決定データも取得
        this.standardMonthlyDecisions = await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey);
      });
  }

  getCurrentDecisionForEmployee(employeeId: string, officeId: string): StandardMonthlyDecision | null {
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    console.log('currentYm:', currentYm, 'employeeId:', employeeId, 'officeId:', officeId);
    const candidates = this.standardMonthlyDecisions
      .filter(r =>
        r.employeeId === employeeId &&
        r.officeId === officeId &&
        r.applyYearMonth <= currentYm
      )
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
    console.log('candidates:', candidates);
    return candidates[0] || null;
  }

  // 決定ボタン押下時
  async onDecision() {
    console.log('onDecision時のthis.salaries:', this.salaries);
    console.log('onDecision時のthis.standardMonthlyGrades:', this.standardMonthlyGrades);
    // 1. 抽出条件で従業員を絞り込み
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeType) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeType === this.selectedEmployeeType);
    }
    // 入社時決定の場合は契約開始日でフィルタ
    if (this.decisionType === 'entry') {
      const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
      // 1ヶ月前の年月を計算
      const applyDate = new Date(this.startYear, this.startMonth - 1, 1);
      const prevMonthDate = new Date(applyDate);
      prevMonthDate.setMonth(applyDate.getMonth() - 1);
      const prevYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const today = new Date();
      const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      filteredEmployees = filteredEmployees.filter(emp => {
        const acqDateRaw = emp.healthInsuranceStatus?.acquisitionDate;
        if (!acqDateRaw) return false;
        const acqDate = new Date(acqDateRaw);
        if (isNaN(acqDate.getTime())) return false; // 無効な日付は除外
        // Date型→YYYY-MM形式へ
        const acqYm = `${acqDate.getFullYear()}-${String(acqDate.getMonth() + 1).padStart(2, '0')}`;
        const isTargetYm = acqYm === applyYm || acqYm === prevYm;
        if (!isTargetYm) return false;
        // 今日現在有効な標準報酬月額が未登録
        const hasCurrentDecision = this.standardMonthlyDecisions.some(dec =>
          dec.employeeId === emp.employeeId &&
          dec.officeId === emp.officeId &&
          dec.applyYearMonth <= currentYm
        );
        return !hasCurrentDecision;
      });
    }
    // 対象従業員がいなければアラート
    if (filteredEmployees.length === 0) {
      alert('対象の従業員がいません。');
      this.resultList = [];
      return;
    }

    // 2. 期間指定（YYYY-MM形式の文字列で比較）
    const fromYm = `${this.salaryFromYear}-${String(this.salaryFromMonth).padStart(2, '0')}`;
    const toYm = `${this.salaryToYear}-${String(this.salaryToMonth).padStart(2, '0')}`;

    // 3. 各従業員ごとに期間内の給与データを集計
    this.resultList = filteredEmployees.map(emp => {
      // 指定期間の給与データを抽出
      const salaryList = this.salaries.filter((sal: any) => {
        return sal.employeeId === emp.employeeId &&
          sal.targetYearMonth >= fromYm &&
          sal.targetYearMonth <= toYm;
      });
      const salaryTotal = salaryList.reduce((sum: number, s: any) => sum + (s.totalSalary || 0), 0);
      const salaryAvg = salaryList.length > 0 ? Math.round(salaryTotal / salaryList.length) : 0;

      // 従業員のofficeからinsuranceTypeを取得
      const office = this.offices.find((o: any) => o.id === emp.officeId);
      const insuranceType = office && office.insuranceType ? office.insuranceType : '1';

      // 適用開始年月で有効な健康保険等級マスタを抽出
      const applyYm = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
      const healthGrades = this.standardMonthlyGrades.filter((grade: any) => {
        return grade.gradeType === 'health' &&
          grade.insuranceType === insuranceType &&
          grade.validFrom <= applyYm &&
          (!grade.validTo || grade.validTo >= applyYm);
      });
      // 健康保険: salaryAvgが範囲内の等級を検索
      const matchedHealthGrade = healthGrades.find((grade: any) => {
        if (grade.upperLimit == null || grade.upperLimit === '') {
          return grade.lowerLimit <= salaryAvg;
        }
        return grade.lowerLimit <= salaryAvg && salaryAvg < grade.upperLimit;
      });
      const judgedGrade = matchedHealthGrade ? matchedHealthGrade.grade : '';
      const judgedMonthly = matchedHealthGrade ? matchedHealthGrade.compensation : 0;

      // 適用開始年月で有効な厚生年金等級マスタを抽出
      const pensionGrades = this.standardMonthlyGrades.filter((grade: any) => {
        return grade.gradeType === 'pension' &&
          grade.insuranceType === insuranceType &&
          grade.validFrom <= applyYm &&
          (!grade.validTo || grade.validTo >= applyYm);
      });
      // 厚生年金: salaryAvgが範囲内の等級を検索
      const matchedPensionGrade = pensionGrades.find((grade: any) => {
        if (grade.upperLimit == null || grade.upperLimit === '') {
          return grade.lowerLimit <= salaryAvg;
        }
        return grade.lowerLimit <= salaryAvg && salaryAvg < grade.upperLimit;
      });
      const pensionJudgedGrade = matchedPensionGrade ? matchedPensionGrade.grade : '';
      const pensionJudgedMonthly = matchedPensionGrade ? matchedPensionGrade.compensation : 0;

      // デバッグ用ログ
      console.log('従業員:', emp.lastName + ' ' + emp.firstName, 'salaryAvg:', salaryAvg, 'applyYm:', applyYm, 'insuranceType:', insuranceType);
      console.log('healthGrades:', healthGrades);
      console.log('matchedHealthGrade:', matchedHealthGrade);
      console.log('pensionGrades:', pensionGrades);
      console.log('matchedPensionGrade:', matchedPensionGrade);

      return {
        employeeId: emp.employeeId,
        officeId: emp.officeId,
        employeeName: emp.lastName + ' ' + emp.firstName,
        currentGrade: emp.grade || '',
        currentMonthly: emp.monthly || 0,
        salaryTotal,
        salaryAvg,
        judgedGrade,
        judgedMonthly,
        pensionJudgedGrade,
        pensionJudgedMonthly
      };
    });
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
        estimatedBaseSalary: row.estimatedBaseSalary,
        estimatedOvertime: row.estimatedOvertime,
        estimatedCommute: row.estimatedCommute,
        estimatedPositionAllowance: row.estimatedPositionAllowance,
        estimatedOtherAllowance: row.estimatedOtherAllowance,
        estimatedInKind: row.estimatedInKind,
        estimatedTotal: row.estimatedTotal
      };
      await this.firestoreService.addStandardMonthlyDecision(decision);
    });
    await Promise.all(promises);
    alert(`${this.resultList.length}件の標準報酬月額データを保存しました。`);
    this.router.navigate(['/manage-standard-monthly']);
    this.isConfirmed = false;
  }

  onDecisionTypeChange() {
    // 今後、typeごとの初期化やバリデーション切り替えなどをここで実装
  }

  // 入社時決定用：見込み報酬入力リスト生成
  onEntryDecision() {
    // 1. 事業所・従業員区分でフィルタ
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeType) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeType === this.selectedEmployeeType);
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

    // 3. 現在有効な標準報酬月額が未登録の従業員のみ
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    filteredEmployees = filteredEmployees.filter(emp => {
      const hasCurrentDecision = this.standardMonthlyDecisions.some(dec =>
        dec.employeeId === emp.employeeId &&
        dec.officeId === emp.officeId &&
        dec.applyYearMonth <= currentYm
      );
      return !hasCurrentDecision;
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
}
