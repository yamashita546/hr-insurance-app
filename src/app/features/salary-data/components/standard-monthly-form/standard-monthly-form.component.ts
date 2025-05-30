import { Component, OnInit } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { StandardMonthlyDecision } from '../../../../core/models/standard-monthly-decision .model';
import { Router ,RouterModule } from '@angular/router';


@Component({
  selector: 'app-standard-monthly-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './standard-monthly-form.component.html',
  styleUrl: './standard-monthly-form.component.css'
})
export class StandardMonthlyFormComponent implements OnInit {
  companyId: string = '';
  companyDisplayId: string = '';
  companyName: string = '';
  offices: any[] = [];
  employees: any[] = [];
  salaries: any[] = [];
  standardMonthlyGrades: any[] = [];

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

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService,
    private router: Router
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
        this.salaries = await this.firestoreService.getSalariesByCompanyId(this.companyId);
        console.log('取得した給与データ:', this.salaries);
        const grades = await firstValueFrom(this.firestoreService.getStandardMonthlyGrades());
        console.log('Firestoreから取得したgrades:', grades);
        this.standardMonthlyGrades = grades || [];
        console.log('this.standardMonthlyGradesセット直後:', this.standardMonthlyGrades);
      });
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
      filteredEmployees = filteredEmployees.filter(emp => emp.type === this.selectedEmployeeType);
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
    // 判定結果をStandardMonthlyDecision型に変換し、Firestoreに一括保存
    const applyYearMonth = `${this.startYear}-${String(this.startMonth).padStart(2, '0')}`;
    const promises = this.resultList.map(async row => {
      // 従業員のofficeIdを取得
      const emp = this.employees.find(e => `${e.lastName} ${e.firstName}` === row.employeeName);
      const officeId = emp ? emp.officeId : '';
      const decision: Omit<StandardMonthlyDecision, 'createdAt' | 'updatedAt'> = {
        companyId: this.companyId,
        officeId: officeId,
        employeeId: emp ? emp.employeeId : '',
        applyYearMonth,
        healthGrade: row.judgedGrade,
        healthMonthly: row.judgedMonthly,
        pensionGrade: row.pensionJudgedGrade,
        pensionMonthly: row.pensionJudgedMonthly,
        salaryTotal: row.salaryTotal,
        salaryAvg: row.salaryAvg
      };
      await this.firestoreService.addStandardMonthlyDecision(decision);
    });
    await Promise.all(promises);
    alert(`${this.resultList.length}件の標準報酬月額データを保存しました。`);
    this.router.navigate(['/manage-standard-monthly']);
  }
}
