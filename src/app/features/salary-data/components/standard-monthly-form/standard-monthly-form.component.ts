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
    if (this.decisionType === 'entry') {
      this.onEntryDecision();
      this.isConfirmed = false;
      return;
    }
    // 定時決定・随時改定など
    let filteredEmployees = this.employees;
    if (this.selectedOfficeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeType) {
      filteredEmployees = filteredEmployees.filter(emp => emp.employeeType === this.selectedEmployeeType);
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
      const salaryList = this.salaries.filter((sal: any) => {
        return sal.employeeId === emp.employeeId &&
          sal.targetYearMonth >= fromYm &&
          sal.targetYearMonth <= toYm;
      });
      const salaryTotal = salaryList.reduce((sum: number, s: any) => sum + (s.totalSalary || 0), 0);
      const salaryAvg = salaryList.length > 0 ? Math.round(salaryTotal / salaryList.length) : 0;
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
    try {
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
}
